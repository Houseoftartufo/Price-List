import type { Catalogue, DiscountTier, Product } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isIsoDate(value: string): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

export function validateProduct(product: Product): ValidationResult {
  const errors: string[] = [];
  const standby = product.orderStatus === 'standby';
  const reasons = new Set(product.standbyReasons ?? []);

  if (!product.sku?.trim()) errors.push('SKU is required.');
  if (!product.categoryId?.trim()) errors.push(`SKU ${product.sku || '?'}: categoryId is required.`);
  if (!product.groupId?.trim()) errors.push(`SKU ${product.sku || '?'}: groupId is required.`);
  if (!product.name?.trim()) errors.push(`SKU ${product.sku || '?'}: name is required.`);
  if (!product.sizeLabel?.trim()) errors.push(`SKU ${product.sku || '?'}: sizeLabel is required.`);

  if (standby) {
    if (reasons.size === 0) errors.push(`SKU ${product.sku || '?'}: standbyReasons are required for a standby product.`);
    if (!Number.isFinite(product.baseUnitPrice) || product.baseUnitPrice < 0) {
      errors.push(`SKU ${product.sku || '?'}: standby baseUnitPrice must be >= 0.`);
    }
    if (reasons.has('price') && product.baseUnitPrice !== 0) {
      errors.push(`SKU ${product.sku || '?'}: price-pending standby row must use baseUnitPrice 0.`);
    }
    if (!Number.isInteger(product.unitsPerCase) || product.unitsPerCase < 0) {
      errors.push(`SKU ${product.sku || '?'}: standby unitsPerCase must be an integer >= 0.`);
    }
    if (reasons.has('case-pack') && product.unitsPerCase !== 0) {
      errors.push(`SKU ${product.sku || '?'}: case-pack-pending standby row must use unitsPerCase 0.`);
    }
  } else {
    if (!Number.isFinite(product.baseUnitPrice) || product.baseUnitPrice <= 0) {
      errors.push(`SKU ${product.sku || '?'}: baseUnitPrice must be > 0.`);
    }
    if (!Number.isInteger(product.unitsPerCase) || product.unitsPerCase <= 0) {
      errors.push(`SKU ${product.sku || '?'}: unitsPerCase must be a positive integer.`);
    }
  }

  if (product.currency !== 'EUR') {
    errors.push(`SKU ${product.sku || '?'}: unsupported currency ${String(product.currency)}.`);
  }

  if (
    product.shelfLifeMonths !== undefined &&
    (!Number.isInteger(product.shelfLifeMonths) || product.shelfLifeMonths <= 0)
  ) {
    errors.push(`SKU ${product.sku || '?'}: shelfLifeMonths must be a positive integer.`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateDiscountPolicy(policy: readonly DiscountTier[]): ValidationResult {
  const errors: string[] = [];

  if (policy.length === 0) {
    return { valid: false, errors: ['Discount policy cannot be empty.'] };
  }

  const sorted = [...policy].sort((a, b) => a.minCases - b.minCases);
  const seen = new Set<number>();
  let previousDiscount = -1;

  for (const tier of sorted) {
    if (!Number.isInteger(tier.minCases) || tier.minCases < 1) {
      errors.push(`Invalid minCases: ${tier.minCases}.`);
    }

    if (seen.has(tier.minCases)) {
      errors.push(`Duplicate discount tier for ${tier.minCases} case(s).`);
    }
    seen.add(tier.minCases);

    if (!Number.isFinite(tier.discountRate) || tier.discountRate < 0 || tier.discountRate >= 1) {
      errors.push(`Invalid discountRate ${tier.discountRate} for ${tier.minCases} case(s).`);
    }

    if (tier.discountRate < previousDiscount) {
      errors.push('Discount policy must be monotonic: larger tiers cannot reduce the discount.');
    }

    previousDiscount = tier.discountRate;
  }

  if (sorted[0]?.minCases !== 1) {
    errors.push('Discount policy must include a base tier starting at 1 case.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateCatalogue(catalogue: Catalogue): ValidationResult {
  const errors: string[] = [];

  if (catalogue.schemaVersion !== 1) errors.push('Unsupported catalogue schemaVersion.');
  if (!catalogue.catalogueVersion?.trim()) errors.push('catalogueVersion is required.');
  if (catalogue.currency !== 'EUR') errors.push('Catalogue currency must be EUR.');
  if (!isIsoDate(catalogue.updatedAt)) errors.push('updatedAt must be a valid date.');
  if (!isIsoDate(catalogue.verifiedAt)) errors.push('verifiedAt must be a valid date.');
  if (!['google-sheet', 'snapshot'].includes(catalogue.source)) errors.push('Invalid catalogue source.');
  if (!['fresh', 'stale', 'fallback'].includes(catalogue.freshness)) errors.push('Invalid freshness state.');

  if (!Array.isArray(catalogue.products) || catalogue.products.length === 0) {
    errors.push('Catalogue must contain at least one product.');
  }

  const seenSkus = new Set<string>();
  for (const product of catalogue.products ?? []) {
    const productResult = validateProduct(product);
    errors.push(...productResult.errors);

    const sku = product.sku?.trim();
    if (sku) {
      if (seenSkus.has(sku)) errors.push(`Duplicate SKU: ${sku}.`);
      seenSkus.add(sku);
    }
  }

  const policyResult = validateDiscountPolicy(catalogue.discountPolicy ?? []);
  errors.push(...policyResult.errors);

  return { valid: errors.length === 0, errors };
}

export function assertValidCatalogue(catalogue: Catalogue): Catalogue {
  const result = validateCatalogue(catalogue);
  if (!result.valid) {
    throw new Error(`Catalogue validation failed:\n${result.errors.map((error) => `- ${error}`).join('\n')}`);
  }
  return catalogue;
}
