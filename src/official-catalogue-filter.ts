import { OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';
import { findRemasteredOfficialVariant, type RemasteredOfficialVariant } from './official-product-remaster';
import type { Product, TruffleType } from './catalog/types';

export interface StrictOfficialCatalogueAudit {
  products: Product[];
  duplicatePriceRows: string[];
  missingPriceVariants: RemasteredOfficialVariant[];
  missingPackVariants: RemasteredOfficialVariant[];
  /** Retained for backwards-compatible diagnostics. Official rows are no longer excluded. */
  excludedForMissingPack: RemasteredOfficialVariant[];
}

function allOfficialVariants(): RemasteredOfficialVariant[] {
  return OFFICIAL_PRODUCT_VARIANTS.map((entry) => {
    const resolved = findRemasteredOfficialVariant(entry.product, entry.size);
    if (!resolved) throw new Error(`Official master could not resolve its own row: ${entry.product} ${entry.size}.`);
    return resolved;
  });
}

function displayName(value: string): string {
  return value
    .toLocaleLowerCase('en')
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\s+%/g, '%')
    .replace(/Extra-Virgin/gi, 'Extra Virgin');
}

function inferCategory(entry: RemasteredOfficialVariant): string {
  const name = entry.product.toLowerCase();
  if (/oil|aceto balsamico/.test(name)) return 'oils';
  if (/butter/.test(name)) return 'butters';
  if (/carpaccio/.test(name)) return 'pure-creams-carpaccio';
  if (/salt|honey|cashew|almond|walnut/.test(name)) return 'salts-honey';
  if (/risotto|polenta/.test(name)) return 'pasta-rice-meals';
  return 'sauces-condiments';
}

function inferTruffleType(name: string): TruffleType {
  const text = name.toLowerCase();
  const types: TruffleType[] = [];
  if (text.includes('white truffle')) types.push('white');
  if (text.includes('black truffle')) types.push('black');
  if (text.includes('summer truffle')) types.push('summer');
  if (text.includes('bianchetto')) types.push('bianchetto');
  const unique = [...new Set(types)];
  return unique.length > 1 ? 'mixed' : unique[0] ?? 'none';
}

export function buildStrictOfficialCatalogue(sourceProducts: readonly Product[]): StrictOfficialCatalogueAudit {
  const priced = new Map<string, Product>();
  const duplicates: string[] = [];

  // The old price source is only a price bridge. A row can enter this map only
  // when it resolves to one exact official Excel product + size combination.
  for (const product of sourceProducts) {
    const official = findRemasteredOfficialVariant(product.name, product.sizeLabel);
    if (!official) continue;
    if (priced.has(official.officialKey)) {
      duplicates.push(`${official.officialKey}:${product.sku}`);
      continue;
    }
    priced.set(official.officialKey, product);
  }

  const official = allOfficialVariants();
  const missingPriceVariants = official.filter((entry) => !priced.has(entry.officialKey));
  const missingPackVariants = official.filter((entry) => entry.packStatus !== 'resolved');

  const products = official.map((entry, index): Product => {
    const source = priced.get(entry.officialKey);
    const standbyReasons: Array<'price' | 'case-pack'> = [];
    if (!source) standbyReasons.push('price');
    if (entry.packStatus !== 'resolved' || !entry.unitsPerCase) standbyReasons.push('case-pack');
    const standby = standbyReasons.length > 0;

    const categoryId = source?.categoryId ?? inferCategory(entry);
    return {
      sku: source?.sku ?? `MASTER-${String(index + 1).padStart(3, '0')}`,
      categoryId,
      groupId: categoryId,
      // Product existence/name/size/ingredients come exclusively from the Excel master.
      name: displayName(entry.product),
      sizeLabel: entry.size.replace(/\s+/g, ''),
      baseUnitPrice: source?.baseUnitPrice ?? 0,
      unitsPerCase: entry.unitsPerCase ?? 0,
      currency: 'EUR',
      truffleType: inferTruffleType(entry.product),
      line: 'standard',
      ...(source?.shelfLifeMonths ? { shelfLifeMonths: source.shelfLifeMonths } : {}),
      active: true,
      orderStatus: standby ? 'standby' : 'orderable',
      ...(standby ? { standbyReasons } : {}),
      officialKey: entry.officialKey,
      officialIngredients: entry.ingredients,
      ...(entry.sku ? { officialSku: entry.sku } : {}),
      syntheticCatalogueCode: !source,
    };
  });

  if (products.length !== OFFICIAL_PRODUCT_VARIANTS.length) {
    throw new Error(`Official catalogue cardinality mismatch: ${products.length}/${OFFICIAL_PRODUCT_VARIANTS.length}.`);
  }

  return {
    products,
    duplicatePriceRows: duplicates,
    missingPriceVariants,
    missingPackVariants,
    excludedForMissingPack: [],
  };
}
