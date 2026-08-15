const ALLOWED_LOCALES = new Set(['en', 'it', 'fr', 'nl']);
const SHOP_ORIGIN = 'https://houseoftartufo.com';

function prefix(locale) {
  return locale === 'en' ? '' : `/${locale}`;
}

function respond(body, status = 200) {
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
    if (request.method !== 'GET') return respond({ error: 'Method not allowed.' }, 405);

    const url = new URL(request.url);
    const sku = url.searchParams.get('sku')?.trim() ?? '';
    const locale = url.searchParams.get('locale')?.trim().toLowerCase() || 'en';
    const handle = url.searchParams.get('handle')?.trim().toLowerCase() ?? '';

    if (!/^[A-Za-z0-9._-]{1,80}$/.test(sku)) return respond({ error: 'Invalid SKU.' }, 400);
    if (!ALLOWED_LOCALES.has(locale)) return respond({ error: 'Unsupported locale.' }, 400);
    if (!/^[a-z0-9][a-z0-9-]{0,160}$/.test(handle)) return respond({ error: 'Invalid handle.' }, 400);

    try {
      const productUrl = `${SHOP_ORIGIN}${prefix(locale)}/products/${encodeURIComponent(handle)}.json`;
      const response = await fetch(productUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 404) return respond({ available: false, reason: 'product-not-found', sku, locale, handle }, 404);
      if (!response.ok) throw new Error(`Localized product JSON returned HTTP ${response.status}.`);

      const payload = await response.json();
      const product = payload?.product;
      if (!product || product.handle !== handle) return respond({ available: false, reason: 'product-mismatch', sku, locale, handle }, 404);

      const exactVariant = Array.isArray(product.variants)
        && product.variants.some((variant) => String(variant?.sku ?? '').trim() === sku);
      const title = typeof product.title === 'string' ? product.title : '';
      const descriptionHtml = typeof product.body_html === 'string' ? product.body_html : '';
      const storeUrl = `${SHOP_ORIGIN}${prefix(locale)}/products/${product.handle}`;

      return respond({
        available: true,
        source: 'shopify-published-localized-storefront',
        sku,
        locale,
        product: {
          id: product.id,
          handle: product.handle,
          status: 'ACTIVE',
          onlineStoreUrl: storeUrl,
          title,
          descriptionHtml,
          translated: locale === 'en' || Boolean(title || descriptionHtml),
          translationAvailable: true,
          exactVariant,
          translatedFields: { title: Boolean(title), bodyHtml: Boolean(descriptionHtml) },
        },
      });
    } catch (error) {
      console.error('[HOT Price List] Localized storefront product error', error);
      return respond({ available: false, reason: 'upstream-error', sku, locale, handle }, 502);
    }
  },
};
