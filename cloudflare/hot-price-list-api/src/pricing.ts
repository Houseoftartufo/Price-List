import type { CanonicalProduct, CanonicalQuoteLine } from './types';

const DISCOUNT_TIERS = [
  { minCases: 15, rate: 0.25 },
  { minCases: 10, rate: 0.20 },
  { minCases: 5, rate: 0.15 },
  { minCases: 3, rate: 0.10 },
  { minCases: 2, rate: 0.05 },
  { minCases: 1, rate: 0 },
] as const;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function discountRateForCases(cases: number): number {
  return DISCOUNT_TIERS.find((tier) => cases >= tier.minCases)?.rate ?? 0;
}

export function priceQuoteLine(product: CanonicalProduct, cases: number): CanonicalQuoteLine {
  if (!Number.isInteger(cases) || cases < 1) throw new Error(`Invalid case quantity for SKU ${product.sku}.`);
  if (!Number.isFinite(product.basePriceExVat) || product.basePriceExVat <= 0) {
    throw new Error(`Commercial price is unavailable for SKU ${product.sku}.`);
  }
  if (!Number.isInteger(product.unitsPerCase) || product.unitsPerCase < 1) {
    throw new Error(`Units per case are unavailable for SKU ${product.sku}.`);
  }

  const discountRate = discountRateForCases(cases);
  const finalUnitPriceExVat = roundMoney(product.basePriceExVat * (1 - discountRate));
  const casePriceExVat = roundMoney(finalUnitPriceExVat * product.unitsPerCase);
  const subtotalExVat = roundMoney(casePriceExVat * cases);

  return {
    sku: product.sku,
    name: product.name,
    cases,
    unitsPerCase: product.unitsPerCase,
    totalUnits: cases * product.unitsPerCase,
    baseUnitPriceExVat: roundMoney(product.basePriceExVat),
    discountRate,
    finalUnitPriceExVat,
    casePriceExVat,
    subtotalExVat,
    vatRate: product.vatRate,
    availability: product.availability,
  };
}
