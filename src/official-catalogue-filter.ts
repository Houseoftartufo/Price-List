import { OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';
import { findRemasteredOfficialVariant, type RemasteredOfficialVariant } from './official-product-remaster';
import type { Product, TruffleType } from './catalog/types';

export interface StrictOfficialCatalogueAudit {
  products: Product[];
  duplicatePriceRows: string[];
  missingPriceVariants: RemasteredOfficialVariant[];
  missingPackVariants: RemasteredOfficialVariant[];
  excludedForMissingPack: RemasteredOfficialVariant[];
}

function allOfficialVariants(): RemasteredOfficialVariant[] {
  return OFFICIAL_PRODUCT_VARIANTS.map((entry) => {
    const resolved = findRemasteredOfficialVariant(entry.product, entry.size);
    if (!resolved) throw new Error(`Official master could not resolve its own row: ${entry.product} ${entry.size}.`);
    return resolved;
  });
}

function inferCategory(entry: RemasteredOfficialVariant): string {
  const name = entry.product.toLowerCase();
  if (/olive oil/.test(name)) return 'oils';
  if (/butter/.test(name)) return 'butters';
  if (/carpaccio/.test(name)) return 'Preserved';
  if (/salt|honey|cashew|almond|walnut/.test(name)) return 'salts-honey';
  if (/risotto|polenta|tarallini/.test(name)) return 'pasta-rice-meals';
  return 'sauces-condiments';
}

function publicCategory(entry: RemasteredOfficialVariant, source: Product | undefined): string {
  // Carpaccio is a preserved truffle preparation, not a cream. Keep this
  // buyer-facing classification canonical even when the legacy price source
  // still carries the old Pure Creams grouping.
  if (/carpaccio/.test(entry.product.toLowerCase())) return 'Preserved';
  return source?.categoryId ?? inferCategory(entry);
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

function shelfLifeMonths(value: string): number | undefined {
  const text = value.trim().toLowerCase();
  const years = text.match(/^(\d+)\s*years?/);
  if (years?.[1]) return Number.parseInt(years[1], 10) * 12;
  const months = text.match(/^(\d+)\s*months?/);
  return months?.[1] ? Number.parseInt(months[1], 10) : undefined;
}

export function buildStrictOfficialCatalogue(sourceProducts: readonly Product[]): StrictOfficialCatalogueAudit {
  const priced = new Map<string, Product>();
  const duplicates: string[] = [];

  // The legacy Price List is a price bridge only. It can donate a B2B price
  // exclusively when product identity + format resolve to one master row.
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

  const products = official.map((entry): Product => {
    const source = priced.get(entry.officialKey);
    const standby = !source;
    const categoryId = publicCategory(entry, source);
    const masterShelfLifeMonths = shelfLifeMonths(entry.shelfLife);

    return {
      // The visible/runtime SKU is the official SKU from Master_file_prodotti.xlsx.
      sku: entry.sku,
      categoryId,
      groupId: categoryId,
      name: entry.product,
      sizeLabel: entry.size,
      baseUnitPrice: source?.baseUnitPrice ?? 0,
      unitsPerCase: entry.unitsPerCase,
      currency: 'EUR',
      truffleType: inferTruffleType(entry.product),
      line: 'standard',
      ...(masterShelfLifeMonths ? { shelfLifeMonths: masterShelfLifeMonths } : {}),
      active: true,
      orderStatus: standby ? 'standby' : 'orderable',
      ...(standby ? { standbyReasons: ['price'] } : {}),
      officialKey: entry.officialKey,
      officialIngredients: entry.ingredients,
      officialSku: entry.sku,
      syntheticCatalogueCode: false,
    };
  });

  if (products.length !== 55 || products.length !== OFFICIAL_PRODUCT_VARIANTS.length) {
    throw new Error(`Official catalogue cardinality mismatch: ${products.length}/${OFFICIAL_PRODUCT_VARIANTS.length}; expected 55.`);
  }

  return {
    products,
    duplicatePriceRows: duplicates,
    missingPriceVariants,
    missingPackVariants: [],
    excludedForMissingPack: [],
  };
}
