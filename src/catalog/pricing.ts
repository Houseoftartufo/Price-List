import type { DiscountTier, PriceBreakdown, Product } from './types';

export const DEFAULT_DISCOUNT_POLICY: readonly DiscountTier[] = [
  { minCases: 1, discountRate: 0 },
  { minCases: 2, discountRate: 0.05 },
  { minCases: 3, discountRate: 0.1 },
  { minCases: 5, discountRate: 0.15 },
  { minCases: 10, discountRate: 0.2 },
  { minCases: 15, discountRate: 0.25 },
] as const;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot round non-finite monetary value: ${value}`);
  }

  // A tiny cent-scale tolerance neutralizes binary floating-point values such
  // as 18.524999999999995 so commercial x.xx5 values follow spreadsheet-style
  // half-up rounding rather than falling one cent below the expected result.
  return Math.round((value + 1e-9) * 100) / 100;
}

export function getActiveDiscountTier(
  cases: number,
  policy: readonly DiscountTier[] = DEFAULT_DISCOUNT_POLICY,
): DiscountTier {
  if (!Number.isInteger(cases) || cases < 1) {
    throw new Error(`Cases must be a positive integer. Received: ${cases}`);
  }

  if (policy.length === 0) {
    throw new Error('Discount policy cannot be empty.');
  }

  const eligible = [...policy]
    .filter((tier) => tier.minCases <= cases)
    .sort((a, b) => b.minCases - a.minCases)[0];

  if (!eligible) {
    throw new Error(`No discount tier covers ${cases} case(s).`);
  }

  return eligible;
}

export function calculatePriceBreakdown(
  product: Product,
  cases: number,
  policy: readonly DiscountTier[] = DEFAULT_DISCOUNT_POLICY,
): PriceBreakdown {
  const standby = product.orderStatus === 'standby';
  const pricePending = standby && product.standbyReasons?.includes('price');
  const packPending = standby && product.standbyReasons?.includes('case-pack');

  if (!standby && (!Number.isFinite(product.baseUnitPrice) || product.baseUnitPrice <= 0)) {
    throw new Error(`Invalid base unit price for SKU ${product.sku}.`);
  }
  if (!standby && (!Number.isInteger(product.unitsPerCase) || product.unitsPerCase < 1)) {
    throw new Error(`Invalid units per case for SKU ${product.sku}.`);
  }
  if (standby && (!Number.isFinite(product.baseUnitPrice) || product.baseUnitPrice < 0)) {
    throw new Error(`Invalid standby base unit price for SKU ${product.sku}.`);
  }
  if (standby && (!Number.isInteger(product.unitsPerCase) || product.unitsPerCase < 0)) {
    throw new Error(`Invalid standby units per case for SKU ${product.sku}.`);
  }

  const tier = getActiveDiscountTier(cases, policy);
  const baseUnitPrice = pricePending ? 0 : roundMoney(product.baseUnitPrice);
  const unitPrice = pricePending ? 0 : roundMoney(baseUnitPrice * (1 - tier.discountRate));

  // A standby row with an unknown pack remains visible but can never fabricate
  // a case price/subtotal. Known unit prices may still be shown informationally.
  const usablePack = packPending ? 0 : product.unitsPerCase;
  const baseCasePrice = usablePack > 0 ? roundMoney(baseUnitPrice * usablePack) : 0;
  const casePrice = usablePack > 0 ? roundMoney(unitPrice * usablePack) : 0;
  const baseSubtotal = usablePack > 0 ? roundMoney(baseCasePrice * cases) : 0;
  const subtotal = usablePack > 0 ? roundMoney(casePrice * cases) : 0;
  const saving = usablePack > 0 ? roundMoney(baseSubtotal - subtotal) : 0;

  return {
    sku: product.sku,
    cases,
    unitsPerCase: product.unitsPerCase,
    discountRate: tier.discountRate,
    discountPercent: tier.discountRate * 100,
    baseUnitPrice,
    unitPrice,
    baseCasePrice,
    casePrice,
    baseSubtotal,
    subtotal,
    saving,
  };
}

export function formatEur(value: number, locale = 'en-BE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}
