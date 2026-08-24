import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { listShopifyEnrichment } from '../src/providers/shopify';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Shopify shadow proxy', () => {
  it('uses the explicit shadow-only proxy without requiring Shopify Admin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      available: true,
      source: 'shopify-admin-graphql',
      apiVersion: '2026-07',
      fetchedAt: '2026-08-24T01:00:00.000Z',
      products: [{
        id: 'gid://shopify/Product/1',
        title: 'Black Truffle Sauce',
        handle: 'black-truffle-sauce',
        status: 'ACTIVE',
        updatedAt: '2026-08-24T00:59:00.000Z',
        descriptionHtml: '<p>English description</p>',
        media: [{ url: 'https://cdn.shopify.com/product.webp' }],
        metafields: [{ namespace: 'hot', key: 'units_per_case', type: 'number_integer', value: '12' }],
        variants: [{
          id: 'gid://shopify/ProductVariant/1',
          title: '80g',
          sku: '5430004174103',
          availableForSale: true,
          selectedOptions: [{ name: 'Size', value: '80g' }],
          media: [],
          metafields: [],
        }],
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const env = {
      SHOPIFY_SHOP_DOMAIN: 'cc4fd8.myshopify.com',
      SHOPIFY_SHADOW_PROXY_URL: 'https://shadow.example/api/shopify-products',
    } as unknown as Env;

    const products = await listShopifyEnrichment(env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://shadow.example/api/shopify-products',
      expect.objectContaining({ headers: { Accept: 'application/json' }, cache: 'no-store' }),
    );
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      productId: 'gid://shopify/Product/1',
      variantId: 'gid://shopify/ProductVariant/1',
      sku: '5430004174103',
      handle: 'black-truffle-sauce',
      title: 'Black Truffle Sauce',
      availableForSale: true,
      imageUrl: 'https://cdn.shopify.com/product.webp',
      sizeLabel: '80g',
      unitsPerCase: 12,
      localized: {
        en: { title: 'Black Truffle Sauce', description: '<p>English description</p>' },
      },
      updatedAt: '2026-08-24T00:59:00.000Z',
    });
  });
});
