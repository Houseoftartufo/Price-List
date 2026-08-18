import { roundMoney } from './catalog/pricing';
import type { Catalogue, Product, ProductStandbyReason } from './catalog/types';

export const SHOPIFY_INCLUDED_VAT_RATE = 0.06;

export type ShopifyLiveStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNLISTED' | string;

export interface ShopifyLiveImage {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface ShopifyLiveMetafield {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface ShopifyLiveVariant {
  id: string;
  title: string;
  sku: string;
  barcode?: string | null;
  price: string;
  compareAtPrice?: string | null;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
  media: ShopifyLiveImage[];
  metafields: ShopifyLiveMetafield[];
}

export interface ShopifyLiveProduct {
  id: string;
  title: string;
  handle: string;
  status: ShopifyLiveStatus;
  vendor: string;
  productType: string;
  tags: string[];
  updatedAt: string;
  descriptionHtml: string;
  onlineStoreUrl?: string | null;
  media: ShopifyLiveImage[];
  metafields: ShopifyLiveMetafield[];
  variants: ShopifyLiveVariant[];
}

export interface ShopifyLivePayload {
  available: boolean;
  source: 'shopify-admin-graphql';
  apiVersion: string;
  fetchedAt?: string;
  masterSkuCount?: number;
  products?: ShopifyLiveProduct[];
  matchedSkus?: string[];
  missingMasterSkus?: string[];
  reason?: string;
}

export interface ShopifyLiveMatch {
  product: ShopifyLiveProduct;
  variant: ShopifyLiveVariant;
}

export interface ShopifyPriceOverlayResult {
  catalogue: Catalogue;
  sourceAvailable: boolean;
  vatRate: number;
  appliedSkus: string[];
  missingSkus: string[];
  invalidPriceSkus: string[];
}

let cataloguePromise: Promise<ShopifyLivePayload | undefined> | undefined;

async function fetchPayload(): Promise<ShopifyLivePayload | undefined> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_500);
  try {
    const response = await fetch('/api/shopify-products', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as ShopifyLivePayload;
    return payload.available && Array.isArray(payload.products) ? payload : undefined;
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function loadShopifyLiveCatalogue(): Promise<ShopifyLivePayload | undefined> {
  cataloguePromise ??= fetchPayload();
  return cataloguePromise;
}

export function resetShopifyLiveCatalogueCache(): void {
  cataloguePromise = undefined;
}

export function matchShopifyLiveVariant(payload: ShopifyLivePayload | undefined, sku: string): ShopifyLiveMatch | undefined {
  const wanted = sku.trim();
  if (!payload?.available || !wanted || !payload.products) return undefined;
  let match: ShopifyLiveMatch | undefined;
  for (const product of payload.products) {
    for (const variant of product.variants) {
      if (variant.sku.trim() !== wanted) continue;
      if (match) return undefined;
      match = { product, variant };
    }
  }
  return match;
}

export function matchShopifyLiveProduct(
  payload: ShopifyLivePayload | undefined,
  handles: string | readonly string[],
): ShopifyLiveProduct | undefined {
  if (!payload?.available || !payload.products) return undefined;
  const wanted = (Array.isArray(handles) ? handles : [handles])
    .map((handle) => handle.trim())
    .filter(Boolean);
  for (const handle of wanted) {
    const matches = payload.products.filter((product) => product.handle === handle);
    if (matches.length === 1) return matches[0];
  }
  return undefined;
}

export function shopifyGrossPriceToExVat(
  price: string,
  vatRate = SHOPIFY_INCLUDED_VAT_RATE,
): number | undefined {
  if (!Number.isFinite(vatRate) || vatRate < 0) {
    throw new Error(`Invalid VAT rate: ${vatRate}`);
  }

  const gross = Number.parseFloat(price);
  if (!Number.isFinite(gross) || gross <= 0) return undefined;
  return roundMoney(gross / (1 + vatRate));
}

function markPricePending(product: Product): Product {
  const reasons = new Set<ProductStandbyReason>(product.standbyReasons ?? []);
  reasons.add('price');
  return {
    ...product,
    baseUnitPrice: 0,
    orderStatus: 'standby',
    standbyReasons: [...reasons],
  };
}

export function applyShopifyExVatPrices(
  catalogue: Catalogue,
  payload: ShopifyLivePayload | undefined,
  vatRate = SHOPIFY_INCLUDED_VAT_RATE,
): ShopifyPriceOverlayResult {
  if (!payload?.available || !Array.isArray(payload.products)) {
    return {
      catalogue,
      sourceAvailable: false,
      vatRate,
      appliedSkus: [],
      missingSkus: [],
      invalidPriceSkus: [],
    };
  }

  const appliedSkus: string[] = [];
  const missingSkus: string[] = [];
  const invalidPriceSkus: string[] = [];

  const products = catalogue.products.map((product): Product => {
    const match = matchShopifyLiveVariant(payload, product.sku);
    if (!match) {
      missingSkus.push(product.sku);
      return markPricePending(product);
    }

    const exVat = shopifyGrossPriceToExVat(match.variant.price, vatRate);
    if (exVat === undefined) {
      invalidPriceSkus.push(product.sku);
      return markPricePending(product);
    }

    appliedSkus.push(product.sku);
    const remainingReasons = (product.standbyReasons ?? []).filter((reason) => reason !== 'price');
    const { standbyReasons: _standbyReasons, ...withoutStandbyReasons } = product;

    return {
      ...withoutStandbyReasons,
      baseUnitPrice: exVat,
      orderStatus: remainingReasons.length > 0 ? 'standby' : 'orderable',
      ...(remainingReasons.length > 0 ? { standbyReasons: remainingReasons } : {}),
    };
  });

  const shopifyTimestamp = payload.fetchedAt ?? catalogue.verifiedAt;
  return {
    catalogue: {
      ...catalogue,
      products,
      updatedAt: shopifyTimestamp,
      verifiedAt: shopifyTimestamp,
    },
    sourceAvailable: true,
    vatRate,
    appliedSkus,
    missingSkus,
    invalidPriceSkus,
  };
}

export async function getShopifyLiveVariant(sku: string): Promise<ShopifyLiveMatch | undefined> {
  return matchShopifyLiveVariant(await loadShopifyLiveCatalogue(), sku);
}

export async function getShopifyLiveProduct(handles: string | readonly string[]): Promise<ShopifyLiveProduct | undefined> {
  return matchShopifyLiveProduct(await loadShopifyLiveCatalogue(), handles);
}
