import type { Env } from './env';
import { upsertCatalogueProduct } from './db';
import { listSheetCommercialProducts } from './providers/sheet';
import { availabilityState, listShopifyEnrichment } from './providers/shopify';
import type { BillitCommercialProduct, CanonicalProduct, Locale, SheetCommercialProduct, ShopifyProductEnrichment } from './types';

interface InternalCatalogueProduct {
  sheetSourceCode?: string;
  sheetUnitsPerCase?: number;
  billitProductId?: number;
  billitModifiedAt?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  shopifyModifiedAt?: string;
  rawInventoryQuantity?: number;
  sourceStatus: {
    sheet?: 'ok';
    billit?: 'ok';
    shopify: 'ok' | 'missing' | 'duplicate';
  };
}

const REQUIRED_LOCALES: Locale[] = ['en', 'fr', 'it', 'nl', 'de'];

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
  commercial: BillitCommercialProduct | SheetCommercialProduct,
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

  const officialUnitsPerCase = 'unitsPerCase' in commercial ? commercial.unitsPerCase : undefined;
  if (!officialUnitsPerCase && shopify && !shopify.unitsPerCase) {
    reasons.push('missing-units-per-case');
    health = 'BLOCKED';
  }
  if (officialUnitsPerCase && shopify?.unitsPerCase && officialUnitsPerCase !== shopify.unitsPerCase) {
    reasons.push('shopify-pack-mismatch');
    if (health === 'READY') health = 'WARNING';
  }
  if (shopify && !shopify.imageUrl) {
    reasons.push('missing-image');
    if (health === 'READY') health = 'WARNING';
  }

  if (shopify) {
    for (const locale of REQUIRED_LOCALES) {
      const content = shopify.localized?.[locale];
      if (!content?.title) reasons.push(`missing-${locale}-title`);
      if (!content?.description) reasons.push(`missing-${locale}-description`);
    }
    if (reasons.some((reason) => reason.startsWith('missing-') && reason !== 'missing-units-per-case' && reason !== 'missing-image')) {
      if (health === 'READY') health = 'WARNING';
    }
  }

  const unitsPerCase = officialUnitsPerCase ?? shopify?.unitsPerCase ?? 0;
  const availability = shopify
    ? availabilityState(shopify.availableForSale, shopify.inventoryQuantity)
    : 'UNAVAILABLE';

  const product: CanonicalProduct = {
    sku: commercial.sku,
    name: commercial.name,
    currency: 'EUR',
    basePriceExVat: commercial.amountExcl,
    vatRate: commercial.vatRate,
    unit: commercial.unit,
    ...('sizeLabel' in commercial ? { sizeLabel: commercial.sizeLabel } : shopify?.sizeLabel ? { sizeLabel: shopify.sizeLabel } : {}),
    unitsPerCase,
    availability,
    ...(shopify?.imageUrl ? { imageUrl: shopify.imageUrl } : {}),
    ...(shopify?.localized ? { localized: shopify.localized } : {}),
    health,
    healthReasons: reasons,
    verifiedAt,
  };

  const isSheet = 'sourceCode' in commercial;
  const internal: InternalCatalogueProduct = {
    ...(isSheet ? {
      sheetSourceCode: commercial.sourceCode,
      sheetUnitsPerCase: commercial.sheetUnitsPerCase,
    } : {
      billitProductId: commercial.productId,
      ...(commercial.lastModified ? { billitModifiedAt: commercial.lastModified } : {}),
    }),
    ...(shopify?.productId ? { shopifyProductId: shopify.productId } : {}),
    ...(shopify?.variantId ? { shopifyVariantId: shopify.variantId } : {}),
    ...(shopify?.updatedAt ? { shopifyModifiedAt: shopify.updatedAt } : {}),
    ...(typeof shopify?.inventoryQuantity === 'number' ? { rawInventoryQuantity: shopify.inventoryQuantity } : {}),
    sourceStatus: {
      ...(isSheet ? { sheet: 'ok' as const } : { billit: 'ok' as const }),
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
    void requestId;
    const [sheetProducts, shopifyProducts] = await Promise.all([
      listSheetCommercialProducts(),
      listShopifyEnrichment(env),
    ]);

    const sheetIndex = indexUnique(sheetProducts);
    if (sheetIndex.duplicates.size > 0) {
      throw new Error(`Duplicate official SKUs from Price List Sheet: ${[...sheetIndex.duplicates].slice(0, 20).join(', ')}`);
    }
    const shopifyIndex = indexUnique(shopifyProducts);
    const verifiedAt = new Date().toISOString();

    let ready = 0;
    let warning = 0;
    let blocked = 0;

    for (const commercial of sheetProducts) {
      const merged = mergeCanonicalProduct(
        commercial,
        shopifyIndex.unique.get(commercial.sku),
        shopifyIndex.duplicates.has(commercial.sku),
        verifiedAt,
      );
      if (merged.product.health === 'READY') ready += 1;
      else if (merged.product.health === 'WARNING') warning += 1;
      else blocked += 1;
      await upsertCatalogueProduct(env, merged.product, merged.internal);
    }

    const shopifyOrphans = [...shopifyIndex.unique.keys()].filter((sku) => !sheetIndex.unique.has(sku)).sort();
    await env.DB.prepare(`
      UPDATE catalogue_syncs
      SET status = 'success', completed_at = ?, item_count = ?, error_count = 0
      WHERE sync_id = ?
    `).bind(new Date().toISOString(), sheetProducts.length, syncId).run();

    return { total: sheetProducts.length, ready, warning, blocked, shopifyOrphans };
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
