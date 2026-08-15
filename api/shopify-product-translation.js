const API_VERSION = '2026-07';
const ALLOWED_LOCALES = new Set(['en', 'it', 'fr', 'nl']);
let cachedToken;

function env(name) {
  return process.env[name]?.trim() || undefined;
}

function normalizeShopDomain(value) {
  const stripped = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const domain = stripped.endsWith('.myshopify.com') ? stripped : `${stripped}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new Error('SHOPIFY_SHOP_DOMAIN must be a valid *.myshopify.com domain.');
  }
  return domain;
}

async function accessToken(shopDomain) {
  const direct = env('SHOPIFY_ADMIN_ACCESS_TOKEN');
  if (direct) return direct;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;
  const clientId = env('SHOPIFY_CLIENT_ID');
  const clientSecret = env('SHOPIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Shopify credentials are not configured.');

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Shopify token request failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Shopify token response did not include access_token.');
  const ttlSeconds = Number.isFinite(payload.expires_in) ? Number(payload.expires_in) : 24 * 60 * 60;
  cachedToken = { token: payload.access_token, expiresAt: now + Math.max(300, ttlSeconds) * 1000 };
  return payload.access_token;
}

const PRODUCT_FIELDS = `
  id
  title
  descriptionHtml
  handle
  status
  onlineStoreUrl
`;

const BASE_QUERY = `#graphql
  query PriceListProductBase($skuQuery: String!, $handleQuery: String!) {
    productVariants(first: 3, query: $skuQuery) {
      nodes {
        sku
        product { ${PRODUCT_FIELDS} }
      }
    }
    products(first: 3, query: $handleQuery) {
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const TRANSLATED_QUERY = `#graphql
  query PriceListProductTranslation($skuQuery: String!, $handleQuery: String!, $locale: String!) {
    productVariants(first: 3, query: $skuQuery) {
      nodes {
        sku
        product {
          ${PRODUCT_FIELDS}
          translations(locale: $locale) { key value locale outdated }
        }
      }
    }
    products(first: 3, query: $handleQuery) {
      nodes {
        ${PRODUCT_FIELDS}
        translations(locale: $locale) { key value locale outdated }
      }
    }
  }
`;

async function graphql(shopDomain, token, query, variables) {
  const response = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Shopify Admin GraphQL returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.errors?.length) {
    const error = new Error(payload.errors.map((item) => item.message || 'unknown').join('; '));
    error.graphqlErrors = payload.errors;
    throw error;
  }
  return payload.data;
}

function exactProduct(data, sku, handle) {
  const exactVariant = data?.productVariants?.nodes?.find((node) => node.sku?.trim() === sku);
  if (exactVariant?.product) return exactVariant.product;
  if (!handle) return undefined;
  return data?.products?.nodes?.find((product) => product.handle === handle);
}

function resolvedProduct(product, locale, translationAvailable) {
  const translations = Array.isArray(product.translations) ? product.translations : [];
  const active = translations.filter((item) => !item.outdated && item.value);
  const byKey = Object.fromEntries(active.map((item) => [item.key, item.value]));
  const translatedTitle = typeof byKey.title === 'string' ? byKey.title : undefined;
  const translatedBody = typeof byKey.body_html === 'string' ? byKey.body_html : undefined;

  return {
    id: product.id,
    handle: product.handle,
    status: product.status,
    onlineStoreUrl: product.onlineStoreUrl ?? null,
    title: locale === 'en' ? product.title : translatedTitle ?? product.title,
    descriptionHtml: locale === 'en' ? product.descriptionHtml : translatedBody ?? product.descriptionHtml,
    translated: locale === 'en' || Boolean(translatedTitle || translatedBody),
    translationAvailable,
    translatedFields: {
      title: Boolean(translatedTitle),
      bodyHtml: Boolean(translatedBody),
    },
  };
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': status === 200 ? 'public, s-maxage=300, stale-while-revalidate=1800' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

    const url = new URL(request.url);
    const sku = url.searchParams.get('sku')?.trim() ?? '';
    const locale = (url.searchParams.get('locale')?.trim().toLowerCase() || 'en');
    const handle = url.searchParams.get('handle')?.trim().toLowerCase() ?? '';

    if (!/^[A-Za-z0-9._-]{1,80}$/.test(sku)) return json({ error: 'Invalid SKU.' }, 400);
    if (!ALLOWED_LOCALES.has(locale)) return json({ error: 'Unsupported locale.' }, 400);
    if (handle && !/^[a-z0-9][a-z0-9-]{0,160}$/.test(handle)) return json({ error: 'Invalid handle.' }, 400);

    const configuredShop = env('SHOPIFY_SHOP_DOMAIN');
    if (!configuredShop) return json({ available: false, reason: 'not-configured' }, 503);

    try {
      const shopDomain = normalizeShopDomain(configuredShop);
      const token = await accessToken(shopDomain);
      const variables = {
        skuQuery: `sku:${sku}`,
        handleQuery: handle ? `handle:${handle}` : 'handle:__price_list_no_match__',
        locale,
      };

      let data;
      let translationAvailable = locale === 'en';
      if (locale === 'en') {
        data = await graphql(shopDomain, token, BASE_QUERY, variables);
      } else {
        try {
          data = await graphql(shopDomain, token, TRANSLATED_QUERY, variables);
          translationAvailable = true;
        } catch (error) {
          // Translation permission must never break the existing catalogue/API.
          console.warn('[HOT Price List] Shopify translations unavailable; using base product content.', error);
          data = await graphql(shopDomain, token, BASE_QUERY, variables);
        }
      }

      const product = exactProduct(data, sku, handle);
      if (!product) return json({ available: false, reason: 'product-not-found', sku, locale }, 404);

      return json({
        available: true,
        source: 'shopify-admin-graphql-localized-product',
        apiVersion: API_VERSION,
        sku,
        locale,
        product: resolvedProduct(product, locale, translationAvailable),
      });
    } catch (error) {
      console.error('[HOT Price List] Shopify localized product API error', error);
      return json({ available: false, reason: 'upstream-error', sku, locale }, 502);
    }
  },
};
