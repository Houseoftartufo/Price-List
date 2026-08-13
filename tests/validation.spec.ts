import { describe, expect, it } from 'vitest';
import { DEFAULT_DISCOUNT_POLICY } from '../src/catalog/pricing';
import type { Catalogue, Product } from '../src/catalog/types';
import { validateCatalogue, validateDiscountPolicy, validateProduct } from '../src/catalog/validation';

const validProduct: Product = {
  sku: '139',
  categoryId: 'natural-line',
  groupId: 'premium-oils',
  name: 'White Truffle EVOO – Natural',
  sizeLabel: '250ml',
  baseUnitPrice: 19.38,
  unitsPerCase: 12,
  currency: 'EUR',
};

const validCatalogue: Catalogue = {
  schemaVersion: 1,
  catalogueVersion: '2026.08.12.1',
  currency: 'EUR',
  updatedAt: '2026-08-12T08:15:00+02:00',
  verifiedAt: '2026-08-12T08:15:10+02:00',
  source: 'google-sheet',
  freshness: 'fresh',
  products: [validProduct],
  discountPolicy: [...DEFAULT_DISCOUNT_POLICY],
};

describe('product validation', () => {
  it('accepts a valid product', () => {
    expect(validateProduct(validProduct)).toEqual({ valid: true, errors: [] });
  });

  it('rejects missing or invalid commercial fields', () => {
    const result = validateProduct({
      ...validProduct,
      sku: '',
      baseUnitPrice: -1,
      unitsPerCase: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('discount policy validation', () => {
  it('accepts the House of Tartufo policy', () => {
    expect(validateDiscountPolicy(DEFAULT_DISCOUNT_POLICY).valid).toBe(true);
  });

  it('rejects duplicate or decreasing tiers', () => {
    const result = validateDiscountPolicy([
      { minCases: 1, discountRate: 0 },
      { minCases: 2, discountRate: 0.1 },
      { minCases: 2, discountRate: 0.05 },
    ]);

    expect(result.valid).toBe(false);
  });
});

describe('catalogue validation', () => {
  it('accepts a valid catalogue', () => {
    expect(validateCatalogue(validCatalogue)).toEqual({ valid: true, errors: [] });
  });

  it('rejects duplicate SKUs', () => {
    const result = validateCatalogue({
      ...validCatalogue,
      products: [validProduct, { ...validProduct }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('Duplicate SKU'))).toBe(true);
  });
});
