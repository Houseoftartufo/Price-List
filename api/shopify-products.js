const API_VERSION = '2026-07';
const MAX_PAGES = 25;

// Mirror of the 55 official SKUs from Master_file_prodotti.xlsx.
// This function intentionally has no TypeScript imports so Vercel can bundle it
// as a plain Node.js ESM function independently from the frontend TS toolchain.
const MASTER_SKUS = new Set([
  '5430004174417', '5430004174387', '5430004174424', '5430004174370',
  '5430004174172', '5430004174219', '5430004174233', '5430004174202',
  '5430004174578', '5430004174288', '5430004174295', '5430004174301',
  '5430004174479', '5430004174011', '5430004174165', '5430004174523',
  '5430004174554', '5430004174271', '5430004174561', '5430004174509',
  '5430004174103', '5430004174110', '5430004174127', '5430004174318',
  '5430004174332', '5430004174325', '5430004174134', '5430004174240',
  '5430004174226', '5430004174257', '5430004174516', '5430004174004',
  '5430004174196', '5430004174585', '5430004174189', '5430004174080',
  '5430004174097', '5430004174073', '5430004174158', '5430004174486',
  '5430004174141', '5430004174264', '5430004174349', '5430004174356',
  '5430004174363', '5430004174448', '5430004174431', '5430004174035',
  '5430004174493', '5430004174547', '5430004174462', '5430004174042',
  '5430004174028', '5430004174530', '5430004174455',
]);

let cachedToken;

const PRODUCTS_QUERY = `#graphql
  query PriceListProducts($cursor: String) {
    products(first: 20, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        tags
        updatedAt
        descriptionHtml
        onlineStoreUrl
        media(first: 5) {
          nodes {
            ... on MediaImage {
              id
              alt
              image { url width height }
            }
          }
        }
        metafields(first: 20) {
          nodes { namespace key type value }
        }
        variants(first: 25) {
          nodes {
            id
            title
            sku
            barcode
            price
            compareAtPrice
            availableForSale
            selectedOptions { name value }
            media(first: 3) {
              nodes {
                ... on MediaImage {
                  id
                  alt
                  image { url width height }
                }
              }
            }
            metafields(first: 10) {
              nodes { namespace key type value }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function env(name) {
  return process.env[name]?.trim() || undefined;
}

function normalizeShopDomain(value) {
  const stripped = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
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
  cachedToken = {
    token: payload.access_token,
    expiresAt: now + Math.max(300, ttlSeconds) * 1000,
  };
  return payload.access_token;
}

function metafieldRules() {
  const configured = env('SHOPIFY_METAFIELD_ALLOWLIST');
  return configured ? configured.split(',').map((value) => value.trim()).filter(Boolean) : [];
}

function exposeMetafield(field, rules) {
  if (rules.includes('*')) return true;
  return rules.some((rule) => {
    const [namespace, key] = rule.split('.');
    return Boolean(namespace && key && namespace === field.namespace && (key === '*' || key === field.key));
  });
}

function mediaImages(nodes) {
  return nodes.flatMap((node) => node.image?.url ? [{
    url: node.image.url,
    alt: node.alt ?? null,
    width: node.image.width ?? null,
    height: node.image.height ?? null,
  }] : []);
}

async function fetchProducts(shopDomain, token) {
  const output = [];
  let cursor = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { cursor } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Shopify Admin GraphQL returned HTTP ${response.status}.`);

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`Shopify Admin GraphQL error: ${payload.errors.map((error) => error.message || 'unknown').join('; ')}`);
    }
    const products = payload.data?.products;
    if (!products) throw new Error('Shopify Admin GraphQL returned no products payload.');
    output.push(...products.nodes);
    if (!products.pageInfo.hasNextPage) return output;
    cursor = products.pageInfo.endCursor ?? null;
    if (!cursor) throw new Error('Shopify pagination expected an endCursor but none was returned.');
  }

  throw new Error(`Shopify product pagination exceeded ${MAX_PAGES} pages.`);
}

function sanitizeProducts(products) {
  const rules = metafieldRules();
  const matchedSkus = new Set();

  const sanitized = products.flatMap((product) => {
    const variants = product.variants.nodes.flatMap((variant) => {
      const sku = variant.sku?.trim();
      if (!sku || !MASTER_SKUS.has(sku)) return [];
      matchedSkus.add(sku);
      return [{
        id: variant.id,
        title: variant.title,
        sku,
        barcode: variant.barcode?.trim() || null,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice ?? null,
        availableForSale: variant.availableForSale,
        selectedOptions: variant.selectedOptions,
        media: mediaImages(variant.media.nodes),
        metafields: variant.metafields.nodes.filter((field) => exposeMetafield(field, rules)),
      }];
    });
    if (!variants.length) return [];

    return [{
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      updatedAt: product.updatedAt,
      descriptionHtml: product.descriptionHtml,
      onlineStoreUrl: product.onlineStoreUrl ?? null,
      media: mediaImages(product.media.nodes),
      metafields: product.metafields.nodes.filter((field) => exposeMetafield(field, rules)),
      variants,
    }];
  });

  return {
    products: sanitized,
    matchedSkus: [...matchedSkus].sort(),
    missingMasterSkus: [...MASTER_SKUS].filter((sku) => !matchedSkus.has(sku)).sort(),
  };
}

function json(body, status = 200, cache = false) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cache ? 'public, s-maxage=120, stale-while-revalidate=600' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

    const configuredShop = env('SHOPIFY_SHOP_DOMAIN');
    if (!configuredShop) {
      return json({
        available: false,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        reason: 'not-configured',
      }, 503);
    }

    try {
      const shopDomain = normalizeShopDomain(configuredShop);
      const token = await accessToken(shopDomain);
      const rawProducts = await fetchProducts(shopDomain, token);
      const sanitized = sanitizeProducts(rawProducts);
      return json({
        available: true,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        fetchedAt: new Date().toISOString(),
        masterSkuCount: MASTER_SKUS.size,
        ...sanitized,
      }, 200, true);
    } catch (error) {
      console.error('[HOT Price List] Shopify live API error', error);
      return json({
        available: false,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        reason: 'upstream-error',
      }, 502);
    }
  },
};
