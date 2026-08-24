import { describe, expect, it } from 'vitest';
import { applyBillitCommercialPrices } from '../src/catalog/billit-live';
import type { Catalogue } from '../src/catalog/types';

const catalogue: Catalogue = {
  schemaVersion: 1,
  catalogueVersion: 'legacy',
  currency: 'EUR',
  updatedAt: '2026-08-24T00:00:00.000Z',
  verifiedAt: '2026-08-24T00:00:00.000Z',
  source: 'snapshot',
  freshness: 'fallback',
  discountPolicy: [{ minCases: 1, discountRate: 0 }],
  products: [
    {
      sku: '5430004174103',
      officialSku: '5430004174103',
      categoryId: 'sauces-condiments',
      groupId: 'sauces-condiments',
      name: 'Black Truffle Sauce',
      sizeLabel: '80g',
      baseUnitPrice: 99,
      unitsPerCase: 12,
      currency: 'EUR',
      orderStatus: 'orderable',
    },
    {
      sku: '5430004174042',
      officialSku: '5430004174042',
      categoryId: 'oils',
      groupId: 'oils',
      name: 'Black Truffle EVOO',
      sizeLabel: '3L',
      baseUnitPrice: 88,
      unitsPerCase: 4,
      currency: 'EUR',
      orderStatus: 'orderable',
    },
  ],
};

describe('Billit buyer-facing price authority', () => {
  it('replaces every legacy/Shopify monetary value with the Billit-derived Worker price', () => {
    const result = applyBillitCommercialPrices(catalogue, {
      ok: true,
      products: [{
        sku: '5430004174103',
        basePriceExVat: 8.5,
        vatRate: 6,
        unit: 'NAR',
        unitsPerCase: 12,
        health: 'READY',
        healthReasons: [],
        verifiedAt: '2026-08-24T20:00:00.000Z',
      }],
    });

    expect(result.catalogue.source).toBe('billit');
    expect(result.catalogue.products[0]).toMatchObject({
      sku: '5430004174103',
      baseUnitPrice: 8.5,
      orderStatus: 'orderable',
    });
    expect(result.appliedSkus).toEqual(['5430004174103']);
  });

  it('fails closed per SKU when Billit has no valid price instead of preserving a Sheet/Shopify fallback', () => {
    const result = applyBillitCommercialPrices(catalogue, {
      ok: true,
      products: [{
        sku: '5430004174103',
        basePriceExVat: 8.5,
        vatRate: 6,
        unit: 'NAR',
        unitsPerCase: 12,
        health: 'READY',
        healthReasons: [],
        verifiedAt: '2026-08-24T20:00:00.000Z',
      }],
    });

    expect(result.catalogue.products[1]).toMatchObject({
      sku: '5430004174042',
      baseUnitPrice: 0,
      orderStatus: 'standby',
      standbyReasons: ['price'],
    });
    expect(result.missingSkus).toContain('5430004174042');
  });

  it('refuses duplicate Billit SKUs rather than guessing which fiscal price wins', () => {
    expect(() => applyBillitCommercialPrices(catalogue, {
      ok: true,
      products: [
        { sku: '5430004174103', basePriceExVat: 8.5, vatRate: 6, unit: 'NAR', unitsPerCase: 12, health: 'READY', healthReasons: [], verifiedAt: '2026-08-24T20:00:00.000Z' },
        { sku: '5430004174103', basePriceExVat: 9.5, vatRate: 6, unit: 'NAR', unitsPerCase: 12, health: 'READY', healthReasons: [], verifiedAt: '2026-08-24T20:00:01.000Z' },
      ],
    })).toThrow(/duplicate Billit SKU/i);
  });
});
