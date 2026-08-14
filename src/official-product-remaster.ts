import { OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from './official-product-master';
import type { Product } from './catalog/types';

export interface RemasteredOfficialVariant extends OfficialProductVariant {
  officialKey: string;
  packStatus: 'resolved' | 'missing';
  unitsPerCase?: number;
  sku?: string;
  skuSource?: 'excel' | 'shopify-verified';
}

const PACK_OVERRIDES: Readonly<Record<string, number | null>> = {
  'black truffle sauce 10%|80g': 12,
  'black truffle sauce 10%|170g': 12,
  'black truffle sauce 10%|500g': 6,
  'black truffle sauce 5%|80g': 12,
  'black truffle sauce 5%|170g': 12,
  'black truffle sauce 5%|500g': 6,
  'white truffle sauce|170g': 12,
  'white truffle sauce|500g': 6,
  'black truffle mayonnaise|120g': 12,
  'truffled ketchup|85g': 12,
  'truffled ketchup|30g': 12,
  'porcini mushrooms creams with summer truffles|180g': 12,
  'porcini mushrooms creams with summer truffles|80g': 12,
  'summer truffle carpaccio|500g': 12,
  'summer truffle carpaccio|170g': 12,
  'summer truffle carpaccio|80g': 12,
  'summer truffle carpaccio|45g': 12,
  'black truffle butter|450g': 12,
  'black truffle butter|160g': 12,
  'black truffle butter|80g': 12,
  'white truffle butter|450g': 12,
  'white truffle butter|160g': 12,
  'white truffle butter|80g': 12,
  'truffle cashew|80g': 16,
  'truffle almonds|80g': 16,
  'truffle walnuts|80g': 16,
  'salt with summer truffle|120g': null,
  'salt with summer truffle|30g': null,
  'salt with white truffle|120g': 12,
  'salt with white truffle|30g': 12,
  'grey salt with truffle|100g': 12,
  'himalayan pink salt with truffle|100g': 12,
  'spicy truffle sauce|180g': 12,
  'spicy truffle sauce|80g': 12,
  'polenta with summer truffle|125g': 12,
  'risotto with summer truffle|300g': 24,
  'risotto with summer truffle|170g': 24,
  'white truffle genovese pesto|80g': 12,
  'acacia honey with truffle|450g': null,
  'acacia honey with truffle|220g': 12,
  'acacia honey with truffle|110g': 12,
  'aceto balsamico di modena|100ml': 12,
  'white truffle extra virgin olive oil|60ml': 12,
  'white truffle extra virgin olive oil|100ml': 12,
  'white truffle extra virgin olive oil|250ml': 12,
  'white truffle extra virgin olive oil|1000ml': 6,
  'white truffle extra virgin olive oil|5000ml': 4,
  'black truffle extra virgin olive oil|60ml': null,
  'black truffle extra virgin olive oil|100ml': 12,
  'black truffle extra virgin olive oil|250ml': 12,
  'black truffle extra virgin olive oil|5000ml': 4,
};

const SKU_OVERRIDES: Readonly<Record<string, { sku: string; source: 'excel' | 'shopify-verified' }>> = {
  'black truffle sauce 5%|80g': { sku: '5430004174103', source: 'excel' },
  'black truffle sauce 5%|170g': { sku: '5430004174110', source: 'excel' },
  'black truffle sauce 5%|500g': { sku: '5430004174127', source: 'excel' },
  'black truffle sauce 10%|80g': { sku: '5430004174318', source: 'excel' },
  'black truffle sauce 10%|500g': { sku: '5430004174332', source: 'excel' },
  'white truffle sauce|170g': { sku: '5430004174134', source: 'excel' },
  'white truffle sauce|500g': { sku: '5430004174240', source: 'excel' },
  'black truffle mayonnaise|120g': { sku: '5430004174189', source: 'excel' },
  'white truffle genovese pesto|80g': { sku: '5430004174509', source: 'excel' },

  'white truffle butter|80g': { sku: '5430004174486', source: 'shopify-verified' },
  'white truffle butter|160g': { sku: '5430004174141', source: 'shopify-verified' },
  'white truffle butter|450g': { sku: '5430004174264', source: 'shopify-verified' },
  'summer truffle carpaccio|45g': { sku: 'Product86', source: 'shopify-verified' },
  'summer truffle carpaccio|80g': { sku: 'Product87', source: 'shopify-verified' },
  'summer truffle carpaccio|170g': { sku: 'Product88', source: 'shopify-verified' },
  'summer truffle carpaccio|500g': { sku: 'Product89', source: 'shopify-verified' },
  'white truffle extra virgin olive oil|60ml': { sku: 'Product56', source: 'shopify-verified' },
  'white truffle extra virgin olive oil|100ml': { sku: '5430004174493', source: 'shopify-verified' },
  'white truffle extra virgin olive oil|250ml': { sku: '5430004174547', source: 'shopify-verified' },
  'white truffle extra virgin olive oil|1000ml': { sku: '5430004174448', source: 'shopify-verified' },
  'white truffle extra virgin olive oil|5000ml': { sku: '5430004174035', source: 'shopify-verified' },
  'black truffle extra virgin olive oil|60ml': { sku: 'Product62', source: 'shopify-verified' },
  'black truffle extra virgin olive oil|100ml': { sku: '5430004174530', source: 'shopify-verified' },
  'black truffle extra virgin olive oil|250ml': { sku: '5430004174455', source: 'shopify-verified' },
  'black truffle extra virgin olive oil|5000ml': { sku: '5430004174028', source: 'shopify-verified' },
};

const EXTRA_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'risotto with summer truffle': ['truffle risotto', 'rice with truffle'],
  'black truffle mayonnaise': ['truffle mayonnaise', 'black truffle mayonnaise'],
  'truffled ketchup': ['truffle ketchup', 'truffled ketchup'],
  'salt with summer truffle': ['sea salt with summer truffle', 'salt with summer truffle'],
  'salt with white truffle': ['sea salt with white truffle', 'salt with white truffle'],
  'black truffle butter': ['butter with summer truffle 3%', 'black truffle butter'],
  'white truffle butter': ['butter with bianchetto truffle 6%', 'white truffle butter'],
  'white truffle sauce': ['white truffled sauce bianchetto truffle 2%', 'white truffle sauce'],
  'black truffle sauce 5%': ['truffled sauce summer truffle 5%', 'black truffle sauce 5%'],
  'black truffle sauce 10%': ['truffled sauce summer truffle 10%', 'black truffle sauce 10%'],
  'porcini mushrooms creams with summer truffles': ['porcini mushroom cream with summer truffle'],
};

function compact(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalise(value: string): string {
  return compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bextra[- ]virgin\b/g, ' extra virgin ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+%/g, '%');
}

function measureKey(value: string): string | undefined {
  const text = compact(value).toLowerCase().replace(',', '.');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|l)\b/);
  if (!match?.[1] || !match[2]) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const unit = match[2] === 'gr' ? 'g' : match[2];
  if (unit === 'kg') return `${Math.round(amount * 1000)}g`;
  if (unit === 'l') return `${Math.round(amount * 1000)}ml`;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${unit}`;
}

function baseKey(product: string, size: string): string {
  return `${normalise(product)}|${measureKey(size) ?? normalise(size)}`;
}

export function officialVariantKey(entry: Pick<OfficialProductVariant, 'product' | 'size'>): string {
  return baseKey(entry.product, entry.size);
}

function aliases(entry: OfficialProductVariant): readonly string[] {
  return [...entry.aliases, ...(EXTRA_ALIASES[normalise(entry.product)] ?? [])];
}

export function findRemasteredOfficialVariant(name: string, size: string): RemasteredOfficialVariant | undefined {
  const wantedName = normalise(name);
  const wantedSize = measureKey(size);
  if (!wantedName || !wantedSize) return undefined;

  const matches = OFFICIAL_PRODUCT_VARIANTS.filter((entry) => {
    if (measureKey(entry.size) !== wantedSize) return false;
    return aliases(entry).some((alias) => {
      const candidate = normalise(alias);
      return wantedName === candidate || wantedName.includes(candidate) || candidate.includes(wantedName);
    });
  });
  if (matches.length !== 1) return undefined;

  const entry = matches[0];
  if (!entry) return undefined;
  const officialKey = officialVariantKey(entry);
  const pack = PACK_OVERRIDES[officialKey];
  const sku = SKU_OVERRIDES[officialKey];
  return {
    ...entry,
    officialKey,
    packStatus: typeof pack === 'number' ? 'resolved' : 'missing',
    ...(typeof pack === 'number' ? { unitsPerCase: pack } : { unitsPerCase: undefined }),
    ...(sku ? { sku: sku.sku, skuSource: sku.source } : { sku: undefined, skuSource: undefined }),
  };
}

export interface OfficialCatalogueAudit {
  products: Product[];
  matchedOfficialKeys: string[];
  duplicatePriceRows: string[];
  missingOfficialVariants: RemasteredOfficialVariant[];
  missingPackVariants: RemasteredOfficialVariant[];
}

export function remasterCatalogueProducts(sourceProducts: readonly Product[]): OfficialCatalogueAudit {
  const chosen = new Map<string, Product>();
  const duplicates: string[] = [];

  for (const product of sourceProducts) {
    const official = findRemasteredOfficialVariant(product.name, product.sizeLabel);
    if (!official) continue;
    if (chosen.has(official.officialKey)) {
      duplicates.push(`${official.officialKey}:${product.sku}`);
      continue;
    }

    chosen.set(official.officialKey, {
      ...product,
      unitsPerCase: official.unitsPerCase ?? product.unitsPerCase,
    });
  }

  const allOfficial = OFFICIAL_PRODUCT_VARIANTS.map((entry) => {
    const remastered = findRemasteredOfficialVariant(entry.product, entry.size);
    if (!remastered) throw new Error(`Official master could not resolve its own row: ${entry.product} ${entry.size}.`);
    return remastered;
  });

  const matched = new Set(chosen.keys());
  return {
    products: [...chosen.values()],
    matchedOfficialKeys: [...matched],
    duplicatePriceRows: duplicates,
    missingOfficialVariants: allOfficial.filter((entry) => !matched.has(entry.officialKey)),
    missingPackVariants: allOfficial.filter((entry) => entry.packStatus !== 'resolved'),
  };
}

export const OFFICIAL_VARIANT_COUNT = OFFICIAL_PRODUCT_VARIANTS.length;
