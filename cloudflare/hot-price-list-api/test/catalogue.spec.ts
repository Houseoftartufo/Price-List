import { describe, expect, it } from 'vitest';
import { mergeCanonicalProduct } from '../src/catalogue';
import type { BillitCommercialProduct, ShopifyProductEnrichment } from '../src/types';

const billit: BillitCommercialProduct = {
  productId: 419999,
  sku: '0048',
  name: 'Black Truffle Sauce',
  amountExcl: 8.5,
  vatRate: 6,
  unit: 'NAR',
};

const shopify: ShopifyProductEnrichment = {
  productId: 'gid://shopify/Product/1',
  variantId: 'gid://shopify/ProductVariant/1',
  sku: '0048',
  handle: 'black-truffle-sauce',
  title: 'Retail title can differ',
  availableForSale: true,
  inventoryQuantity: 4,
  imageUrl: 'https://cdn.shopify.com/example.webp',
  sizeLabel: '180 g',
  unitsPerCase: 12,
};

describe('canonical catalogue merge', () => {
  it('takes price/name/VAT from Billit and stock/media/pack from Shopify', () => {
    const { product } = mergeCanonicalProduct(billit, shopify, false, '2026-08-23T12:00:00.000Z');
    expect(product.name).toBe('Black Truffle Sauce');
    expect(product.basePriceExVat).toBe(8.5);
    expect(product.vatRate).toBe(6);
    expect(product.unitsPerCase).toBe(12);
    expect(product.imageUrl).toContain('shopify');
    expect(product.availability).toBe('LOW_STOCK');
    expect(product.health).toBe('READY');
  });

  it('blocks a Billit product that has no matching Shopify SKU', () => {
    const { product } = mergeCanonicalProduct(billit, undefined, false);
    expect(product.health).toBe('BLOCKED');
    expect(product.healthReasons).toContain('missing-shopify-sku');
  });

  it('blocks duplicate Shopify SKUs rather than guessing', () => {
    const { product } = mergeCanonicalProduct(billit, undefined, true);
    expect(product.health).toBe('BLOCKED');
    expect(product.healthReasons).toContain('duplicate-shopify-sku');
  });

  it('warns on a missing image without changing the authority model', () => {
    const { imageUrl: _imageUrl, ...withoutImage } = shopify;
    const { product } = mergeCanonicalProduct(billit, withoutImage, false);
    expect(product.health).toBe('WARNING');
    expect(product.healthReasons).toContain('missing-image');
    expect(product.basePriceExVat).toBe(billit.amountExcl);
  });
});
