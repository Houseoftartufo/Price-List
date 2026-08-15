import { describe, expect, it } from 'vitest';
import { matchShopifyLiveProduct, matchShopifyLiveVariant, type ShopifyLivePayload } from '../src/shopify-live';

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
    {
      id: 'gid://shopify/Product/2',
      title: 'Black Truffle Extra-Virgin Olive Oil',
      handle: 'black-truffle-extra-virgin-olive-oil',
      status: 'ACTIVE',
      vendor: 'House of Tartufo',
      productType: 'Oil',
      tags: ['Product'],
      updatedAt: '2026-08-15T11:00:00Z',
      descriptionHtml: '<p>Black truffle oil</p>',
      onlineStoreUrl: 'https://houseoftartufo.com/products/black-truffle-extra-virgin-olive-oil',
      media: [{ url: 'https://cdn.shopify.com/black-oil.webp' }],
      metafields: [],
      variants: [
        {
          id: 'gid://shopify/ProductVariant/2',
          title: '5L',
          sku: '5430004174028',
          barcode: '05430004174028',
          price: '120.00',
          compareAtPrice: null,
          availableForSale: true,
          selectedOptions: [{ name: 'Size', value: '5000ml' }],
          media: [],
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

  it('can safely resolve a product family without pretending another variant is the requested SKU', () => {
    expect(matchShopifyLiveVariant(payload, '5430004174042')).toBeUndefined();
    const product = matchShopifyLiveProduct(payload, 'black-truffle-extra-virgin-olive-oil');
    expect(product?.status).toBe('ACTIVE');
    expect(product?.media[0]?.url).toBe('https://cdn.shopify.com/black-oil.webp');
    expect(product?.variants.some((variant) => variant.sku === '5430004174042')).toBe(false);
  });

  it('uses handle priority for a family fallback', () => {
    const product = matchShopifyLiveProduct(payload, ['missing-handle', 'black-truffle-extra-virgin-olive-oil']);
    expect(product?.handle).toBe('black-truffle-extra-virgin-olive-oil');
  });
});
