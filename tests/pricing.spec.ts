import { describe, expect, it } from 'vitest';
import { calculatePriceBreakdown, getActiveDiscountTier, roundMoney } from '../src/catalog/pricing';
import type { Product } from '../src/catalog/types';

const product: Product = {
  sku: '46',
  categoryId: 'butters',
  groupId: 'summer-truffle-butter',
  name: 'Butter with Summer Truffle 3%',
  sizeLabel: '80g',
  baseUnitPrice: 6.73,
  unitsPerCase: 12,
  currency: 'EUR',
};

describe('commercial money rounding', () => {
  it('matches spreadsheet half-up rounding for x.xx5 floating-point values', () => {
    expect(roundMoney(19.5 * 0.95)).toBe(18.53);
    expect(roundMoney(10.91 * 0.95)).toBe(10.36);
  });
});

describe('wholesale discount policy', () => {
  it.each([
    [1, 0],
    [2, 0.05],
    [3, 0.1],
    [4, 0.1],
    [5, 0.15],
    [9, 0.15],
    [10, 0.2],
    [14, 0.2],
    [15, 0.25],
    [100, 0.25],
  ])('applies the correct tier for %i case(s)', (cases, expectedRate) => {
    expect(getActiveDiscountTier(cases).discountRate).toBe(expectedRate);
  });

  it('rejects invalid case quantities', () => {
    expect(() => getActiveDiscountTier(0)).toThrow();
    expect(() => getActiveDiscountTier(1.5)).toThrow();
  });
});

describe('price breakdown', () => {
  it('derives case price from the displayed unit price', () => {
    const price = calculatePriceBreakdown(product, 1);

    expect(price.baseUnitPrice).toBe(6.73);
    expect(price.unitPrice).toBe(6.73);
    expect(price.casePrice).toBe(roundMoney(price.unitPrice * 12));
    expect(price.casePrice).toBe(80.76);
    expect(price.subtotal).toBe(80.76);
  });

  it('calculates the 25% tier without contradictory unit/case values', () => {
    const price = calculatePriceBreakdown(product, 15);

    expect(price.discountRate).toBe(0.25);
    expect(price.unitPrice).toBe(5.05);
    expect(price.casePrice).toBe(60.6);
    expect(price.casePrice).toBe(roundMoney(price.unitPrice * 12));
    expect(price.subtotal).toBe(909);
    expect(price.saving).toBe(302.4);
  });

  it('rejects invalid commercial product data', () => {
    expect(() => calculatePriceBreakdown({ ...product, baseUnitPrice: 0 }, 1)).toThrow();
    expect(() => calculatePriceBreakdown({ ...product, unitsPerCase: 0 }, 1)).toThrow();
  });
});
