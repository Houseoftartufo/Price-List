import type { Env } from './env';
import {
  getCatalogueProduct,
  getQuoteByIdempotencyKey,
  insertQuote,
  nextQuoteId,
  upsertCatalogueProduct,
} from './db';
import { mergeCanonicalProduct } from './catalogue';
import { listBillitProducts } from './providers/billit';
import { listShopifyEnrichment } from './providers/shopify';
import { priceQuoteLine, roundMoney } from './pricing';
import type { BillitCommercialProduct, CanonicalQuote, QuoteRequestInput, ShopifyProductEnrichment } from './types';

function uniqueBySku<T extends { sku: string }>(items: T[]): { unique: Map<string, T>; duplicates: Set<string> } {
  const unique = new Map<string, T>();
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

  // Billit is authoritative for fiscal product identity, price and VAT; Shopify is authoritative for availability/media.
  const [billitProducts, shopifyProducts] = await Promise.all([
    listBillitProducts(env, requestId),
    listShopifyEnrichment(env),
  ]);
  const billit = uniqueBySku<BillitCommercialProduct>(billitProducts);
  const shopify = uniqueBySku<ShopifyProductEnrichment>(shopifyProducts);
  if (billit.duplicates.size > 0) {
    throw new Error(`Duplicate fiscal SKUs from Billit: ${[...billit.duplicates].slice(0, 20).join(', ')}`);
  }
  const lines = [];
  let latestCatalogueVerification = '';

  for (const requested of input.lines) {
    const projected = await getCatalogueProduct(env, requested.sku);
    const freshCommercial = billit.unique.get(requested.sku);
    if (!projected || !freshCommercial) {
      throw new Error(`SKU ${requested.sku} is not present in the verified B2B catalogue.`);
    }

    const freshShopify = shopify.unique.get(requested.sku);
    const merged = mergeCanonicalProduct(
      freshCommercial,
      freshShopify,
      shopify.duplicates.has(requested.sku),
      new Date().toISOString(),
    );

    // Persist the fresh projection and price history before creating the immutable quote snapshot.
    await upsertCatalogueProduct(env, merged.product, merged.internal);

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
