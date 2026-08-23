import { describe, expect, it } from 'vitest';
import { discountRateForCases, priceQuoteLine } from '../src/pricing';
import type { CanonicalProduct } from '../src/types';

const product: CanonicalProduct = {
  sku: '0048',
  name: 'Black Truffle Sauce',
  currency: 'EUR',
  basePriceExVat: 10,
  vatRate: 6,
  unit: 'NAR',
  sizeLabel: '180 g',
  unitsPerCase: 12,
  availability: 'IN_STOCK',
  health: 'READY',
  healthReasons: [],
  billitProductId: 419999,
  shopifyProductId: 'gid://shopify/Product/1',
  shopifyVariantId: 'gid://shopify/ProductVariant/1',
  verifiedAt: '2026-08-23T12:00:00.000Z',
};

describe('HOT volume pricing', () => {
  it.each([
    [1, 0],
    [2, 0.05],
    [3, 0.10],
    [5, 0.15],
    [10, 0.20],
    [15, 0.25],
    [24, 0.25],
  ])('uses the correct discount for %i cases', (cases, expected) => {
    expect(discountRateForCases(cases)).toBe(expected);
  });

  it('rounds the buyer-facing unit price first and derives totals from it', () => {
    const line = priceQuoteLine({ ...product, basePriceExVat: 8.47 }, 5);
    expect(line.discountRate).toBe(0.15);
    expect(line.finalUnitPriceExVat).toBe(7.2);
    expect(line.casePriceExVat).toBe(86.4);
    expect(line.subtotalExVat).toBe(432);
    expect(line.totalUnits).toBe(60);
  });

  it('rejects invalid case quantities', () => {
    expect(() => priceQuoteLine(product, 0)).toThrow(/Invalid case quantity/);
  });
});
