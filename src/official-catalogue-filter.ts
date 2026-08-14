import { OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';
import { findRemasteredOfficialVariant, officialVariantKey, type RemasteredOfficialVariant } from './official-product-remaster';
import type { Product } from './catalog/types';

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

export function buildStrictOfficialCatalogue(sourceProducts: readonly Product[]): StrictOfficialCatalogueAudit {
  const priced = new Map<string, Product>();
  const duplicates: string[] = [];

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
  const excludedForMissingPack: RemasteredOfficialVariant[] = [];
  const products: Product[] = [];

  for (const entry of official) {
    const source = priced.get(entry.officialKey);
    if (!source) continue;
    if (entry.packStatus !== 'resolved' || !entry.unitsPerCase) {
      excludedForMissingPack.push(entry);
      continue;
    }
    products.push({
      ...source,
      unitsPerCase: entry.unitsPerCase,
    });
  }

  const activeKeys = new Set(products.map((product) => {
    const entry = findRemasteredOfficialVariant(product.name, product.sizeLabel);
    return entry?.officialKey;
  }).filter((key): key is string => Boolean(key)));

  for (const product of products) {
    const entry = findRemasteredOfficialVariant(product.name, product.sizeLabel);
    if (!entry || !activeKeys.has(officialVariantKey(entry))) {
      throw new Error(`Strict official catalogue admitted a non-master row: ${product.name} ${product.sizeLabel}.`);
    }
  }

  return {
    products,
    duplicatePriceRows: duplicates,
    missingPriceVariants,
    missingPackVariants,
    excludedForMissingPack,
  };
}
