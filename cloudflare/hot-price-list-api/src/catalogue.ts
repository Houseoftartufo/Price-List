import type { Env } from './env';
import { upsertCatalogueProduct } from './db';
import { listBillitProducts } from './providers/billit';
import { availabilityState, listShopifyEnrichment } from './providers/shopify';
import type { BillitCommercialProduct, CanonicalProduct, ShopifyProductEnrichment } from './types';

interface InternalCatalogueProduct {
  billitProductId: number;
  billitModifiedAt?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  shopifyModifiedAt?: string;
  rawInventoryQuantity?: number;
  sourceStatus: {
    billit: 'ok';
    shopify: 'ok' | 'missing' | 'duplicate';
  };
}

function indexUnique<T extends { sku: string }>(items: T[]): { unique: Map<string, T>; duplicates: Set<string> } {
  const unique = new Map<string, T>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (unique.has(item.sku)) {
      duplicates.add(item.sku);
      unique.delete(item.sku);
      continue;
    }
    if (!duplicates.has(item.sku)) unique.set(item.sku, item);
  }
  return { unique, duplicates };
}

export function mergeCanonicalProduct(
  billit: BillitCommercialProduct,
  shopify: ShopifyProductEnrichment | undefined,
  shopifyDuplicate: boolean,
  verifiedAt = new Date().toISOString(),
): { product: CanonicalProduct; internal: InternalCatalogueProduct } {
  const reasons: string[] = [];
  let health: CanonicalProduct['health'] = 'READY';

  if (shopifyDuplicate) {
    reasons.push('duplicate-shopify-sku');
    health = 'BLOCKED';
  } else if (!shopify) {
    reasons.push('missing-shopify-sku');
    health = 'BLOCKED';
  }

  if (shopify && !shopify.unitsPerCase) {
    reasons.push('missing-units-per-case');
    health = 'BLOCKED';
  }
  if (shopify && !shopify.imageUrl) {
    reasons.push('missing-image');
    if (health === 'READY') health = 'WARNING';
  }

  const unitsPerCase = shopify?.unitsPerCase ?? 0;
  const availability = shopify
    ? availabilityState(shopify.availableForSale, shopify.inventoryQuantity)
    : 'UNAVAILABLE';

  const product: CanonicalProduct = {
    sku: billit.sku,
    name: billit.name,
    currency: 'EUR',
    basePriceExVat: billit.amountExcl,
    vatRate: billit.vatRate,
    unit: billit.unit,
    ...(shopify?.sizeLabel ? { sizeLabel: shopify.sizeLabel } : {}),
    unitsPerCase,
    availability,
    ...(shopify?.imageUrl ? { imageUrl: shopify.imageUrl } : {}),
    ...(shopify?.localized ? { localized: shopify.localized } : {}),
    health,
    healthReasons: reasons,
    verifiedAt,
  };

  const internal: InternalCatalogueProduct = {
    billitProductId: billit.productId,
    ...(billit.lastModified ? { billitModifiedAt: billit.lastModified } : {}),
    ...(shopify?.productId ? { shopifyProductId: shopify.productId } : {}),
    ...(shopify?.variantId ? { shopifyVariantId: shopify.variantId } : {}),
    ...(shopify?.updatedAt ? { shopifyModifiedAt: shopify.updatedAt } : {}),
    ...(typeof shopify?.inventoryQuantity === 'number' ? { rawInventoryQuantity: shopify.inventoryQuantity } : {}),
    sourceStatus: {
      billit: 'ok',
      shopify: shopifyDuplicate ? 'duplicate' : shopify ? 'ok' : 'missing',
    },
  };

  return { product, internal };
}

export async function syncCanonicalCatalogue(env: Env, requestId: string): Promise<{
  total: number;
  ready: number;
  warning: number;
  blocked: number;
  shopifyOrphans: string[];
}> {
  const startedAt = new Date().toISOString();
  const syncId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO catalogue_syncs (sync_id, source, status, started_at)
    VALUES (?, 'reconciliation', 'running', ?)
  `).bind(syncId, startedAt).run();

  try {
    const [billitProducts, shopifyProducts] = await Promise.all([
      listBillitProducts(env, requestId),
      listShopifyEnrichment(env),
    ]);

    const billitIndex = indexUnique(billitProducts);
    if (billitIndex.duplicates.size > 0) {
      throw new Error(`Duplicate Billit references detected: ${[...billitIndex.duplicates].slice(0, 20).join(', ')}`);
    }
    const shopifyIndex = indexUnique(shopifyProducts);
    const verifiedAt = new Date().toISOString();

    let ready = 0;
    let warning = 0;
    let blocked = 0;

    for (const billit of billitProducts) {
      const merged = mergeCanonicalProduct(
        billit,
        shopifyIndex.unique.get(billit.sku),
        shopifyIndex.duplicates.has(billit.sku),
        verifiedAt,
      );
      if (merged.product.health === 'READY') ready += 1;
      else if (merged.product.health === 'WARNING') warning += 1;
      else blocked += 1;
      await upsertCatalogueProduct(env, merged.product, merged.internal);
    }

    const shopifyOrphans = [...shopifyIndex.unique.keys()].filter((sku) => !billitIndex.unique.has(sku)).sort();
    await env.DB.prepare(`
      UPDATE catalogue_syncs
      SET status = 'success', completed_at = ?, item_count = ?, error_count = 0
      WHERE sync_id = ?
    `).bind(new Date().toISOString(), billitProducts.length, syncId).run();

    return { total: billitProducts.length, ready, warning, blocked, shopifyOrphans };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(`
      UPDATE catalogue_syncs
      SET status = 'failed', completed_at = ?, error_count = 1, error_summary = ?
      WHERE sync_id = ?
    `).bind(new Date().toISOString(), message.slice(0, 1000), syncId).run();
    throw error;
  }
}
