import { describe, expect, it } from 'vitest';
import { matchShopifyLiveVariant, type ShopifyLivePayload } from '../src/shopify-live';

const payload: ShopifyLivePayload = {
  available: true,
  source: 'shopify-admin-graphql',
  apiVersion: '2026-07',
  products: [
    {
      id: 'gid://shopify/Product/1',
      title: 'Draft Product',
      handle: 'draft-product',
      status: 'DRAFT',
      vendor: 'House of Tartufo',
      productType: 'Sauce',
      tags: [],
      updatedAt: '2026-08-15T10:00:00Z',
      descriptionHtml: '<p>Draft</p>',
      onlineStoreUrl: null,
      media: [{ url: 'https://cdn.shopify.com/draft.webp' }],
      metafields: [],
      variants: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: '80g',
          sku: '5430004174103',
          barcode: '05430004174103',
          price: '10.00',
          compareAtPrice: null,
          availableForSale: false,
          selectedOptions: [{ name: 'Size', value: '80g' }],
          media: [{ url: 'https://cdn.shopify.com/draft-80.webp' }],
          metafields: [],
        },
      ],
    },
  ],
};

describe('Shopify live SKU matcher', () => {
  it('matches one Admin API variant by exact official SKU', () => {
    const match = matchShopifyLiveVariant(payload, '5430004174103');
    expect(match?.product.status).toBe('DRAFT');
    expect(match?.variant.barcode).toBe('05430004174103');
    expect(match?.variant.media[0]?.url).toBe('https://cdn.shopify.com/draft-80.webp');
  });

  it('does not match an unknown SKU', () => {
    expect(matchShopifyLiveVariant(payload, '5430004179999')).toBeUndefined();
  });

  it('refuses ambiguous duplicate SKU matches', () => {
    const duplicate: ShopifyLivePayload = {
      ...payload,
      products: [...(payload.products ?? []), ...(payload.products ?? [])],
    };
    expect(matchShopifyLiveVariant(duplicate, '5430004174103')).toBeUndefined();
  });

  it('does nothing when the live API is unavailable', () => {
    expect(matchShopifyLiveVariant({ ...payload, available: false }, '5430004174103')).toBeUndefined();
  });
});
