import { OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from './official-product-master';
import type { Product } from './catalog/types';

export interface RemasteredOfficialVariant extends OfficialProductVariant {
  officialKey: string;
  packStatus: 'resolved';
  skuSource: 'master';
}

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

export function officialVariantKey(entry: Pick<OfficialProductVariant, 'product' | 'size'>): string {
  return `${normalise(entry.product)}|${measureKey(entry.size) ?? normalise(entry.size)}`;
}

function aliases(entry: OfficialProductVariant): readonly string[] {
  return [entry.product, entry.sourceName, ...entry.aliases];
}

function percentToken(value: string): string | undefined {
  return normalise(value).match(/\b(\d+)%\b/)?.[1];
}

function remastered(entry: OfficialProductVariant): RemasteredOfficialVariant {
  return {
    ...entry,
    officialKey: officialVariantKey(entry),
    packStatus: 'resolved',
    skuSource: 'master',
  };
}

export function findRemasteredOfficialVariantBySku(sku: string): RemasteredOfficialVariant | undefined {
  const wantedSku = compact(sku);
  if (!wantedSku) return undefined;
  const entry = OFFICIAL_PRODUCT_VARIANTS.find((variant) => variant.sku === wantedSku);
  return entry ? remastered(entry) : undefined;
}

export function findRemasteredOfficialVariant(name: string, size: string): RemasteredOfficialVariant | undefined {
  const wantedName = normalise(name);
  const wantedSize = measureKey(size);
  if (!wantedName || !wantedSize) return undefined;

  const sameSize = OFFICIAL_PRODUCT_VARIANTS.filter((entry) => measureKey(entry.size) === wantedSize);
  const exact = sameSize.filter((entry) => aliases(entry).some((alias) => normalise(alias) === wantedName));
  if (exact.length === 1 && exact[0]) return remastered(exact[0]);
  if (exact.length > 1) return undefined;

  const wantedPercent = percentToken(name);
  const scored = sameSize
    .map((entry) => {
      const entryPercent = percentToken(entry.product);
      if (wantedPercent && entryPercent && wantedPercent !== entryPercent) return { entry, score: -1 };
      const score = Math.max(0, ...aliases(entry).map((alias) => {
        const candidate = normalise(alias);
        if (!candidate) return 0;
        if (wantedName.includes(candidate)) return candidate.length;
        if (candidate.includes(wantedName)) return wantedName.length;
        return 0;
      }));
      return { entry, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored[0]) return undefined;
  if (scored[1]?.score === scored[0].score) return undefined;
  return remastered(scored[0].entry);
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
      sku: official.sku,
      name: official.product,
      sizeLabel: official.size,
      unitsPerCase: official.unitsPerCase,
      officialSku: official.sku,
      officialKey: official.officialKey,
      officialIngredients: official.ingredients,
    });
  }

  const allOfficial = OFFICIAL_PRODUCT_VARIANTS.map(remastered);
  const matched = new Set(chosen.keys());
  return {
    products: [...chosen.values()],
    matchedOfficialKeys: [...matched],
    duplicatePriceRows: duplicates,
    missingOfficialVariants: allOfficial.filter((entry) => !matched.has(entry.officialKey)),
    missingPackVariants: [],
  };
}

export const OFFICIAL_VARIANT_COUNT = OFFICIAL_PRODUCT_VARIANTS.length;
