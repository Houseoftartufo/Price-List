import type { CanonicalProduct, CanonicalQuote, CanonicalQuoteLine, QuoteJob } from './types';
import type { Env } from './env';

interface QuoteRow {
  quote_id: string;
  idempotency_key: string;
  status: 'ACCEPTED';
  locale: CanonicalQuote['locale'];
  preferred_channel: CanonicalQuote['preferredChannel'];
  customer_json: string;
  total_ex_vat: number;
  currency: 'EUR';
  catalogue_verified_at: string;
  created_at: string;
  billit_status: string;
  billit_order_id: string | null;
  attio_status: string;
  attio_deal_id: string | null;
  admin_status: string;
  last_error: string | null;
}

interface QuoteLineRow {
  snapshot_json: string;
}

export async function upsertCatalogueProduct(env: Env, product: CanonicalProduct, internal: unknown): Promise<void> {
  const existing = await env.DB.prepare('SELECT public_json FROM catalogue_products WHERE sku = ?')
    .bind(product.sku)
    .first<{ public_json: string }>();

  if (existing) {
    try {
      const previous = JSON.parse(existing.public_json) as CanonicalProduct;
      if (previous.basePriceExVat !== product.basePriceExVat || previous.vatRate !== product.vatRate) {
        await env.DB.prepare(`
          INSERT INTO price_history (sku, old_amount_excl, new_amount_excl, vat_rate, observed_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(product.sku, previous.basePriceExVat, product.basePriceExVat, product.vatRate, product.verifiedAt).run();
      }
    } catch {
      // Corrupt projection data is replaced below by the newly verified provider payload.
    }
  }

  await env.DB.prepare(`
    INSERT INTO catalogue_products (
      sku, public_json, internal_json, health, verified_at, billit_modified_at, shopify_modified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(sku) DO UPDATE SET
      public_json = excluded.public_json,
      internal_json = excluded.internal_json,
      health = excluded.health,
      verified_at = excluded.verified_at,
      billit_modified_at = excluded.billit_modified_at,
      shopify_modified_at = excluded.shopify_modified_at
  `).bind(
    product.sku,
    JSON.stringify(product),
    JSON.stringify(internal),
    product.health,
    product.verifiedAt,
    (internal as { billitModifiedAt?: string }).billitModifiedAt ?? null,
    (internal as { shopifyModifiedAt?: string }).shopifyModifiedAt ?? null,
  ).run();
}

export async function getCatalogueProduct(env: Env, sku: string): Promise<CanonicalProduct | undefined> {
  const row = await env.DB.prepare('SELECT public_json FROM catalogue_products WHERE sku = ?')
    .bind(sku)
    .first<{ public_json: string }>();
  if (!row) return undefined;
  return JSON.parse(row.public_json) as CanonicalProduct;
}

export async function getCatalogueInternal<T>(env: Env, sku: string): Promise<T | undefined> {
  const row = await env.DB.prepare('SELECT internal_json FROM catalogue_products WHERE sku = ?')
    .bind(sku)
    .first<{ internal_json: string }>();
  if (!row) return undefined;
  return JSON.parse(row.internal_json) as T;
}

export async function listPublicCatalogue(env: Env): Promise<CanonicalProduct[]> {
  const result = await env.DB.prepare(`
    SELECT public_json FROM catalogue_products
    ORDER BY sku ASC
  `).all<{ public_json: string }>();
  return result.results.map((row) => JSON.parse(row.public_json) as CanonicalProduct);
}

export async function nextQuoteId(env: Env, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const row = await env.DB.prepare(`
    INSERT INTO quote_sequences (year, next_value)
    VALUES (?, 1)
    ON CONFLICT(year) DO UPDATE SET next_value = quote_sequences.next_value + 1
    RETURNING next_value
  `).bind(year).first<{ next_value: number }>();

  if (!row?.next_value) throw new Error('Unable to allocate quote sequence.');
  return `HOT-Q-${year}-${String(row.next_value).padStart(6, '0')}`;
}

export async function getQuoteByIdempotencyKey(env: Env, idempotencyKey: string): Promise<CanonicalQuote | undefined> {
  const row = await env.DB.prepare('SELECT * FROM quotes WHERE idempotency_key = ?')
    .bind(idempotencyKey)
    .first<QuoteRow>();
  return row ? hydrateQuote(env, row) : undefined;
}

export async function getQuote(env: Env, quoteId: string): Promise<CanonicalQuote | undefined> {
  const row = await env.DB.prepare('SELECT * FROM quotes WHERE quote_id = ?')
    .bind(quoteId)
    .first<QuoteRow>();
  return row ? hydrateQuote(env, row) : undefined;
}

async function hydrateQuote(env: Env, row: QuoteRow): Promise<CanonicalQuote> {
  const lines = await env.DB.prepare(`
    SELECT snapshot_json FROM quote_lines WHERE quote_id = ? ORDER BY line_no ASC
  `).bind(row.quote_id).all<QuoteLineRow>();

  return {
    quoteId: row.quote_id,
    status: 'ACCEPTED',
    locale: row.locale,
    preferredChannel: row.preferred_channel,
    customer: JSON.parse(row.customer_json),
    lines: lines.results.map((line) => JSON.parse(line.snapshot_json) as CanonicalQuoteLine),
    totalExVat: row.total_ex_vat,
    currency: 'EUR',
    createdAt: row.created_at,
    catalogueVerifiedAt: row.catalogue_verified_at,
  };
}

export async function insertQuote(env: Env, quote: CanonicalQuote, idempotencyKey: string): Promise<void> {
  const statements = [
    env.DB.prepare(`
      INSERT INTO quotes (
        quote_id, idempotency_key, status, locale, preferred_channel,
        customer_json, total_ex_vat, currency, catalogue_verified_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      quote.quoteId,
      idempotencyKey,
      quote.status,
      quote.locale,
      quote.preferredChannel,
      JSON.stringify(quote.customer),
      quote.totalExVat,
      quote.currency,
      quote.catalogueVerifiedAt,
      quote.createdAt,
    ),
    ...quote.lines.map((line, index) => env.DB.prepare(`
      INSERT INTO quote_lines (quote_id, line_no, sku, snapshot_json)
      VALUES (?, ?, ?, ?)
    `).bind(quote.quoteId, index + 1, line.sku, JSON.stringify(line))),
    env.DB.prepare(`
      INSERT INTO quote_events (quote_id, event_type, event_json, created_at)
      VALUES (?, 'quote.accepted', ?, ?)
    `).bind(quote.quoteId, JSON.stringify({ preferredChannel: quote.preferredChannel }), quote.createdAt),
  ];

  await env.DB.batch(statements);
}

export async function updateProviderStatus(
  env: Env,
  quoteId: string,
  provider: QuoteJob['kind'],
  status: string,
  ref?: string,
  error?: string,
): Promise<void> {
  const column = provider === 'billit' ? 'billit_status' : provider === 'attio' ? 'attio_status' : 'admin_status';
  const refColumn = provider === 'billit' ? 'billit_order_id' : provider === 'attio' ? 'attio_deal_id' : undefined;
  const now = new Date().toISOString();

  if (refColumn && ref) {
    await env.DB.prepare(`UPDATE quotes SET ${column} = ?, ${refColumn} = ?, last_error = ? WHERE quote_id = ?`)
      .bind(status, ref, error ?? null, quoteId).run();
  } else {
    await env.DB.prepare(`UPDATE quotes SET ${column} = ?, last_error = ? WHERE quote_id = ?`)
      .bind(status, error ?? null, quoteId).run();
  }

  await env.DB.prepare(`
    INSERT INTO quote_events (quote_id, event_type, event_json, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(quoteId, `${provider}.${status}`, JSON.stringify(ref ? { ref } : error ? { error } : {}), now).run();
}

export async function recordProviderAttempt(
  env: Env,
  job: QuoteJob,
  status: string,
  startedAt: string,
  responseRef?: string,
  error?: Error,
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO provider_attempts (
      quote_id, provider, attempt, status, started_at, completed_at, response_ref, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    job.quoteId,
    job.kind,
    job.attempt,
    status,
    startedAt,
    new Date().toISOString(),
    responseRef ?? null,
    error?.message ?? null,
  ).run();
}
