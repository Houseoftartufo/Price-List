import type { CanonicalProduct, CanonicalQuote, CanonicalQuoteLine, QuoteJob } from './types';
import type { Env } from './env';

const PROVIDER_CLAIM_STALE_MS = 4 * 60 * 60 * 1000;
const PROVIDER_PROCESSING_STALE_MS = 15 * 60 * 1000;

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

interface ProviderJobRow {
  quote_id: string;
  provider: QuoteJob['kind'];
  attempt: number;
}

export interface QuoteOperationalStatus {
  quoteId: string;
  status: string;
  billit: { status: string; orderId?: string };
  attio: { status: string; dealId?: string };
  admin: { status: string };
  lastError?: string;
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

  const internalMeta = internal as { billitModifiedAt?: string; shopifyModifiedAt?: string };
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
    internalMeta.billitModifiedAt ?? null,
    internalMeta.shopifyModifiedAt ?? null,
  ).run();
}

export async function getCatalogueProduct(env: Env, sku: string): Promise<CanonicalProduct | undefined> {
  const row = await env.DB.prepare('SELECT public_json FROM catalogue_products WHERE sku = ?')
    .bind(sku)
    .first<{ public_json: string }>();
  return row ? JSON.parse(row.public_json) as CanonicalProduct : undefined;
}

export async function getCatalogueInternal<T>(env: Env, sku: string): Promise<T | undefined> {
  const row = await env.DB.prepare('SELECT internal_json FROM catalogue_products WHERE sku = ?')
    .bind(sku)
    .first<{ internal_json: string }>();
  return row ? JSON.parse(row.internal_json) as T : undefined;
}

export async function listPublicCatalogue(env: Env): Promise<CanonicalProduct[]> {
  const result = await env.DB.prepare('SELECT public_json FROM catalogue_products ORDER BY sku ASC')
    .all<{ public_json: string }>();
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
  const lines = await env.DB.prepare('SELECT snapshot_json FROM quote_lines WHERE quote_id = ? ORDER BY line_no ASC')
    .bind(row.quote_id)
    .all<QuoteLineRow>();
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
      quote.quoteId, idempotencyKey, quote.status, quote.locale, quote.preferredChannel,
      JSON.stringify(quote.customer), quote.totalExVat, quote.currency, quote.catalogueVerifiedAt, quote.createdAt,
    ),
    ...quote.lines.map((line, index) => env.DB.prepare(`
      INSERT INTO quote_lines (quote_id, line_no, sku, snapshot_json) VALUES (?, ?, ?, ?)
    `).bind(quote.quoteId, index + 1, line.sku, JSON.stringify(line))),
    env.DB.prepare(`
      INSERT INTO quote_events (quote_id, event_type, event_json, created_at)
      VALUES (?, 'quote.accepted', ?, ?)
    `).bind(quote.quoteId, JSON.stringify({ preferredChannel: quote.preferredChannel }), quote.createdAt),
    ...(['billit', 'attio', 'admin'] as const).map((provider) => env.DB.prepare(`
      INSERT INTO provider_jobs (quote_id, provider, status, attempt, available_at)
      VALUES (?, ?, 'pending', 0, ?)
    `).bind(quote.quoteId, provider, quote.createdAt)),
  ];
  await env.DB.batch(statements);
}

export async function getQuoteOperationalStatus(env: Env, quoteId: string): Promise<QuoteOperationalStatus | undefined> {
  const row = await env.DB.prepare(`
    SELECT quote_id, status, billit_status, billit_order_id, attio_status, attio_deal_id, admin_status, last_error
    FROM quotes WHERE quote_id = ?
  `).bind(quoteId).first<Pick<QuoteRow,
    'quote_id' | 'status' | 'billit_status' | 'billit_order_id' | 'attio_status' | 'attio_deal_id' | 'admin_status' | 'last_error'
  >>();
  if (!row) return undefined;
  return {
    quoteId: row.quote_id,
    status: row.status,
    billit: { status: row.billit_status, ...(row.billit_order_id ? { orderId: row.billit_order_id } : {}) },
    attio: { status: row.attio_status, ...(row.attio_deal_id ? { dealId: row.attio_deal_id } : {}) },
    admin: { status: row.admin_status },
    ...(row.last_error ? { lastError: row.last_error } : {}),
  };
}

function providerColumns(provider: QuoteJob['kind']): { status: string; ref?: string } {
  if (provider === 'billit') return { status: 'billit_status', ref: 'billit_order_id' };
  if (provider === 'attio') return { status: 'attio_status', ref: 'attio_deal_id' };
  return { status: 'admin_status' };
}

export async function claimProviderJobs(env: Env, limit = 50, quoteId?: string): Promise<QuoteJob[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const staleIso = new Date(now.getTime() - PROVIDER_CLAIM_STALE_MS).toISOString();
  const quoteFilter = quoteId ? 'AND quote_id = ?' : '';
  const statement = env.DB.prepare(`
    UPDATE provider_jobs
    SET status = 'queued', attempt = attempt + 1, locked_at = ?, last_error = NULL
    WHERE rowid IN (
      SELECT rowid
      FROM provider_jobs
      WHERE available_at <= ?
        AND (
          status IN ('pending','failed')
          OR (
            status IN ('queued','processing','retrying')
            AND locked_at IS NOT NULL
            AND locked_at <= ?
          )
        )
        ${quoteFilter}
      ORDER BY available_at ASC, quote_id ASC, provider ASC
      LIMIT ?
    )
    RETURNING quote_id, provider, attempt
  `);
  const bound = quoteId
    ? statement.bind(nowIso, nowIso, staleIso, quoteId, limit)
    : statement.bind(nowIso, nowIso, staleIso, limit);
  const result = await bound.all<ProviderJobRow>();
  return result.results.map((row) => ({ quoteId: row.quote_id, kind: row.provider, attempt: row.attempt }));
}

export async function releaseClaimedProviderJobs(env: Env, jobs: QuoteJob[], error?: string): Promise<void> {
  if (!jobs.length) return;
  await env.DB.batch(jobs.map((job) => env.DB.prepare(`
    UPDATE provider_jobs
    SET status = 'pending', locked_at = NULL, last_error = ?
    WHERE quote_id = ? AND provider = ? AND status = 'queued'
  `).bind(error?.slice(0, 1000) ?? null, job.quoteId, job.kind)));
}

export async function beginProviderJob(env: Env, job: QuoteJob, deliveryAttempt: number): Promise<boolean> {
  const now = new Date();
  const nowIso = now.toISOString();
  const staleProcessingIso = new Date(now.getTime() - PROVIDER_PROCESSING_STALE_MS).toISOString();
  const row = await env.DB.prepare(`
    UPDATE provider_jobs
    SET status = 'processing', attempt = MAX(attempt, ?), locked_at = ?, last_error = NULL
    WHERE quote_id = ? AND provider = ?
      AND status <> 'success'
      AND available_at <= ?
      AND (
        status IN ('queued','pending','failed','retrying')
        OR (? > 1 AND status = 'processing')
        OR (status = 'processing' AND (locked_at IS NULL OR locked_at <= ?))
      )
    RETURNING quote_id
  `).bind(
    Math.max(job.attempt, deliveryAttempt),
    nowIso,
    job.quoteId,
    job.kind,
    nowIso,
    deliveryAttempt,
    staleProcessingIso,
  ).first<{ quote_id: string }>();
  return Boolean(row?.quote_id);
}

export async function markProviderSuccess(env: Env, job: QuoteJob, ref: string): Promise<void> {
  const columns = providerColumns(job.kind);
  const now = new Date().toISOString();
  const quoteStatement = columns.ref
    ? env.DB.prepare(`UPDATE quotes SET ${columns.status} = 'success', ${columns.ref} = ?, last_error = NULL WHERE quote_id = ?`)
        .bind(ref, job.quoteId)
    : env.DB.prepare(`UPDATE quotes SET ${columns.status} = 'success', last_error = NULL WHERE quote_id = ?`)
        .bind(job.quoteId);

  await env.DB.batch([
    quoteStatement,
    env.DB.prepare(`
      UPDATE provider_jobs
      SET status = 'success', completed_at = ?, locked_at = NULL, last_error = NULL
      WHERE quote_id = ? AND provider = ?
    `).bind(now, job.quoteId, job.kind),
    env.DB.prepare(`
      INSERT INTO quote_events (quote_id, event_type, event_json, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(job.quoteId, `${job.kind}.success`, JSON.stringify({ ref }), now),
  ]);
}

export async function markProviderFailure(
  env: Env,
  job: QuoteJob,
  error: string,
  delaySeconds: number,
): Promise<void> {
  const columns = providerColumns(job.kind);
  const now = new Date();
  const nowIso = now.toISOString();
  const retryAt = new Date(now.getTime() + delaySeconds * 1000).toISOString();
  const safeError = error.slice(0, 1000);

  await env.DB.batch([
    env.DB.prepare(`UPDATE quotes SET ${columns.status} = 'retrying', last_error = ? WHERE quote_id = ?`)
      .bind(safeError, job.quoteId),
    env.DB.prepare(`
      UPDATE provider_jobs
      SET status = 'retrying', available_at = ?, locked_at = ?, last_error = ?
      WHERE quote_id = ? AND provider = ?
    `).bind(retryAt, nowIso, safeError, job.quoteId, job.kind),
    env.DB.prepare(`
      INSERT INTO quote_events (quote_id, event_type, event_json, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(job.quoteId, `${job.kind}.failed`, JSON.stringify({ error: safeError, retryAt }), nowIso),
  ]);
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
    job.quoteId, job.kind, job.attempt, status, startedAt, new Date().toISOString(),
    responseRef ?? null, error?.message ?? null,
  ).run();
}
