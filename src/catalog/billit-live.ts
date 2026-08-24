import type { Catalogue, ProductStandbyReason } from './types';

export type BillitCatalogueHealth = 'READY' | 'WARNING' | 'BLOCKED';

export interface BillitPublicProduct {
  sku: string;
  basePriceExVat: number;
  vatRate: number;
  unit: string;
  unitsPerCase: number;
  health: BillitCatalogueHealth;
  healthReasons: string[];
  verifiedAt: string;
}

export interface BillitCataloguePayload {
  ok: true;
  products: BillitPublicProduct[];
}

export interface BillitCommercialOverlay {
  catalogue: Catalogue;
  appliedSkus: string[];
  missingSkus: string[];
}

function isPositiveMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isBillitPayload(value: unknown): value is BillitCataloguePayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BillitCataloguePayload>;
  return candidate.ok === true && Array.isArray(candidate.products);
}

function standbyForMissingBillitPrice(product: Catalogue['products'][number]): Catalogue['products'][number] {
  const reasons = new Set<ProductStandbyReason>(product.standbyReasons ?? []);
  reasons.add('price');
  return {
    ...product,
    baseUnitPrice: 0,
    orderStatus: 'standby',
    standbyReasons: [...reasons],
  };
}

export function applyBillitCommercialPrices(
  catalogue: Catalogue,
  payload: BillitCataloguePayload,
): BillitCommercialOverlay {
  const bySku = new Map<string, BillitPublicProduct>();
  const duplicates = new Set<string>();

  for (const product of payload.products) {
    const sku = product.sku?.trim();
    if (!sku) continue;
    if (bySku.has(sku)) {
      duplicates.add(sku);
      bySku.delete(sku);
      continue;
    }
    if (!duplicates.has(sku)) bySku.set(sku, product);
  }

  if (duplicates.size > 0) {
    throw new Error(`Duplicate Billit SKU(s) in fiscal catalogue: ${[...duplicates].sort().join(', ')}.`);
  }

  const appliedSkus: string[] = [];
  const missingSkus: string[] = [];
  let verifiedAt = catalogue.verifiedAt;

  const products = catalogue.products.map((product) => {
    const billit = bySku.get(product.sku);
    if (!billit || billit.health === 'BLOCKED' || !isPositiveMoney(billit.basePriceExVat)) {
      missingSkus.push(product.sku);
      return standbyForMissingBillitPrice(product);
    }

    appliedSkus.push(product.sku);
    if (!Number.isNaN(Date.parse(billit.verifiedAt)) && billit.verifiedAt > verifiedAt) verifiedAt = billit.verifiedAt;

    const remainingReasons = (product.standbyReasons ?? []).filter((reason) => reason !== 'price');
    const { standbyReasons: _standbyReasons, ...withoutStandbyReasons } = product;
    return {
      ...withoutStandbyReasons,
      baseUnitPrice: billit.basePriceExVat,
      orderStatus: remainingReasons.length > 0 ? 'standby' as const : 'orderable' as const,
      ...(remainingReasons.length > 0 ? { standbyReasons: remainingReasons } : {}),
    };
  });

  const { sourceMeta: _sourceMeta, ...withoutSourceMeta } = catalogue;
  return {
    catalogue: {
      ...withoutSourceMeta,
      catalogueVersion: `billit-${verifiedAt.replace(/[-:TZ.]/g, '').slice(0, 14)}`,
      source: 'billit',
      freshness: 'fresh',
      updatedAt: verifiedAt,
      verifiedAt,
      products,
    },
    appliedSkus: appliedSkus.sort(),
    missingSkus: missingSkus.sort(),
  };
}

export async function loadBillitCommercialCatalogue(apiBase: string): Promise<BillitCataloguePayload> {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/catalogue`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Billit catalogue API returned HTTP ${response.status}.`);

  const payload: unknown = await response.json();
  if (!isBillitPayload(payload)) throw new Error('Billit catalogue API returned an invalid payload.');
  if (payload.products.length === 0) throw new Error('Billit catalogue API returned an empty fiscal catalogue.');
  return payload;
}
