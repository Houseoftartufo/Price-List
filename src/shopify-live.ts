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

export async function getShopifyLiveVariant(sku: string): Promise<ShopifyLiveMatch | undefined> {
  return matchShopifyLiveVariant(await loadShopifyLiveCatalogue(), sku);
}
