import type { Env } from './env';
import {
  getCatalogueInternal,
  getCatalogueProduct,
  getQuoteByIdempotencyKey,
  insertQuote,
  nextQuoteId,
  upsertCatalogueProduct,
} from './db';
import { mergeCanonicalProduct } from './catalogue';
import { getBillitProductById } from './providers/billit';
import { listShopifyEnrichment } from './providers/shopify';
import { priceQuoteLine, roundMoney } from './pricing';
import type { CanonicalQuote, QuoteRequestInput, ShopifyProductEnrichment } from './types';

interface InternalCatalogueProduct {
  billitProductId: number;
}

function uniqueShopifyBySku(items: ShopifyProductEnrichment[]): { unique: Map<string, ShopifyProductEnrichment>; duplicates: Set<string> } {
  const unique = new Map<string, ShopifyProductEnrichment>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (unique.has(item.sku)) {
      duplicates.add(item.sku);
      unique.delete(item.sku);
    } else if (!duplicates.has(item.sku)) {
      unique.set(item.sku, item);
    }
  }
  return { unique, duplicates };
}

export async function acceptQuote(env: Env, requestId: string, input: QuoteRequestInput): Promise<{ quote: CanonicalQuote; duplicate: boolean }> {
  const existing = await getQuoteByIdempotencyKey(env, input.idempotencyKey);
  if (existing) return { quote: existing, duplicate: true };

  // A fresh Shopify read makes Shopify authoritative for availability at submit time.
  const shopify = uniqueShopifyBySku(await listShopifyEnrichment(env));
  const lines = [];
  let latestCatalogueVerification = '';

  for (const requested of input.lines) {
    const projected = await getCatalogueProduct(env, requested.sku);
    const internal = await getCatalogueInternal<InternalCatalogueProduct>(env, requested.sku);
    if (!projected || !internal?.billitProductId) {
      throw new Error(`SKU ${requested.sku} is not present in the verified B2B catalogue.`);
    }

    // Billit is authoritative for reference, official commercial name, ex-VAT price and VAT.
    const freshBillit = await getBillitProductById(env, requestId, internal.billitProductId);
    if (freshBillit.sku !== requested.sku) {
      throw new Error(`Billit reference mismatch for requested SKU ${requested.sku}.`);
    }

    const freshShopify = shopify.unique.get(requested.sku);
    const merged = mergeCanonicalProduct(
      freshBillit,
      freshShopify,
      shopify.duplicates.has(requested.sku),
      new Date().toISOString(),
    );

    // Persist the fresh projection and price history before creating the immutable quote snapshot.
    await upsertCatalogueProduct(env, merged.product, {
      billitProductId: freshBillit.productId,
      billitModifiedAt: freshBillit.lastModified,
      shopifyProductId: freshShopify?.productId,
      shopifyVariantId: freshShopify?.variantId,
      shopifyModifiedAt: freshShopify?.updatedAt,
      rawInventoryQuantity: freshShopify?.inventoryQuantity,
      sourceStatus: {
        billit: 'ok',
        shopify: shopify.duplicates.has(requested.sku) ? 'duplicate' : freshShopify ? 'ok' : 'missing',
      },
    });

    if (merged.product.health === 'BLOCKED') {
      throw new Error(`SKU ${requested.sku} is blocked: ${merged.product.healthReasons.join(', ')}.`);
    }

    lines.push(priceQuoteLine(merged.product, requested.cases));
    if (merged.product.verifiedAt > latestCatalogueVerification) latestCatalogueVerification = merged.product.verifiedAt;
  }

  const createdAt = new Date().toISOString();
  const quote: CanonicalQuote = {
    quoteId: await nextQuoteId(env, new Date(createdAt)),
    status: 'ACCEPTED',
    locale: input.locale,
    preferredChannel: input.preferredChannel,
    customer: input.customer,
    lines,
    totalExVat: roundMoney(lines.reduce((sum, line) => sum + line.subtotalExVat, 0)),
    currency: 'EUR',
    createdAt,
    catalogueVerifiedAt: latestCatalogueVerification || createdAt,
  };

  try {
    await insertQuote(env, quote, input.idempotencyKey);
  } catch (error) {
    // Concurrent duplicate submits can race before either request observes the idempotency row.
    const raced = await getQuoteByIdempotencyKey(env, input.idempotencyKey);
    if (raced) return { quote: raced, duplicate: true };
    throw error;
  }

  return { quote, duplicate: false };
}
