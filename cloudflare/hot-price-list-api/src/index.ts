import type { Env } from './env';
import { quoteEngineEnabled } from './env';
import {
  getCatalogueProduct,
  getQuote,
  getQuoteByIdempotencyKey,
  getQuoteOperationalStatus,
  listPublicCatalogue,
  markOutboxAttempt,
  pendingProviderJobs,
  recordProviderAttempt,
  updateProviderStatus,
} from './db';
import { syncCanonicalCatalogue } from './catalogue';
import { acceptQuote } from './quote-service';
import { parseQuoteRequest } from './validation';
import { createBillitOffer } from './providers/billit';
import { projectQuoteToAttio } from './providers/attio';
import { notifyAdmin } from './providers/admin';
import type { QuoteJob } from './types';

type RuntimeEnv = Env & { SYNC_SHARED_KEY?: string };

function requestId(request: Request): string {
  return request.headers.get('cf-ray') || request.headers.get('x-request-id') || crypto.randomUUID();
}

function allowedOrigin(request: Request, env: Env): string | undefined {
  const origin = request.headers.get('origin');
  if (!origin) return undefined;
  const configured = (env.API_ORIGIN || 'https://pricelist.houseoftartufo.com')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : undefined;
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = allowedOrigin(request, env);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Idempotency-Key,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(request: Request, env: Env, body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Cache-Control': status === 200 ? 'no-store' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

function isInternalRequest(request: Request, env: Env): boolean {
  const runtime = env as RuntimeEnv;
  if (!runtime.SYNC_SHARED_KEY) return false;
  const value = request.headers.get('authorization');
  return value === `Bearer ${runtime.SYNC_SHARED_KEY}`;
}

async function enqueueInitialJobs(env: Env, quoteId: string): Promise<void> {
  const jobs: QuoteJob[] = [
    { quoteId, kind: 'billit', attempt: 0 },
    { quoteId, kind: 'attio', attempt: 0 },
    { quoteId, kind: 'admin', attempt: 0 },
  ];
  await env.QUOTE_JOBS.sendBatch(jobs.map((body) => ({ body })));
}

async function enqueueRecoveryJobs(env: Env): Promise<number> {
  const jobs = await pendingProviderJobs(env, 50);
  if (!jobs.length) return 0;
  await env.QUOTE_JOBS.sendBatch(jobs.map((body) => ({ body })));
  return jobs.length;
}

async function handleQuote(request: Request, env: Env): Promise<Response> {
  if (!quoteEngineEnabled(env)) {
    return json(request, env, { ok: false, code: 'quote-engine-disabled' }, 503);
  }

  const rid = requestId(request);
  try {
    const payload = parseQuoteRequest(await request.json());
    const result = await acceptQuote(env, rid, payload);

    if (!result.duplicate) {
      try {
        await enqueueInitialJobs(env, result.quote.quoteId);
      } catch (error) {
        console.error('[HOT Price List] queue dispatch failed; durable outbox retained', {
          requestId: rid,
          quoteId: result.quote.quoteId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return json(request, env, {
      ok: true,
      duplicate: result.duplicate,
      quote: {
        quoteId: result.quote.quoteId,
        status: result.quote.status,
        currency: result.quote.currency,
        totalExVat: result.quote.totalExVat,
        lines: result.quote.lines,
        createdAt: result.quote.createdAt,
      },
    }, result.duplicate ? 200 : 202);
  } catch (error) {
    console.error('[HOT Price List] quote submission rejected', {
      requestId: rid,
      message: error instanceof Error ? error.message : String(error),
    });
    return json(request, env, {
      ok: false,
      code: 'quote-verification-failed',
      requestId: rid,
      message: 'We could not verify this quotation right now. Please try again or contact House of Tartufo.',
    }, 422);
  }
}

async function handleStatus(request: Request, env: Env, quoteId: string): Promise<Response> {
  const key = request.headers.get('x-idempotency-key')?.trim();
  if (!key) return json(request, env, { ok: false, code: 'missing-quote-key' }, 401);
  const quote = await getQuoteByIdempotencyKey(env, key);
  if (!quote || quote.quoteId !== quoteId) return json(request, env, { ok: false, code: 'not-found' }, 404);
  const status = await getQuoteOperationalStatus(env, quoteId);
  return status
    ? json(request, env, { ok: true, ...status })
    : json(request, env, { ok: false, code: 'not-found' }, 404);
}

async function handleInternalSync(request: Request, env: Env): Promise<Response> {
  if (!isInternalRequest(request, env)) return json(request, env, { ok: false, code: 'unauthorized' }, 401);
  const rid = requestId(request);
  try {
    const result = await syncCanonicalCatalogue(env, rid);
    return json(request, env, { ok: true, requestId: rid, ...result });
  } catch (error) {
    console.error('[HOT Price List] catalogue sync failed', {
      requestId: rid,
      message: error instanceof Error ? error.message : String(error),
    });
    return json(request, env, { ok: false, requestId: rid, code: 'catalogue-sync-failed' }, 502);
  }
}

async function fetchHandler(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  const url = new URL(request.url);
  if (url.pathname === '/health' && request.method === 'GET') {
    return json(request, env, {
      ok: true,
      service: 'hot-price-list-api',
      quoteEngineEnabled: quoteEngineEnabled(env),
      version: '0.1.0',
    });
  }

  if (url.pathname === '/catalogue' && request.method === 'GET') {
    const products = (await listPublicCatalogue(env)).filter((product) => product.health !== 'BLOCKED');
    return json(request, env, { ok: true, products }, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
    });
  }

  const productMatch = url.pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch && request.method === 'GET') {
    const sku = decodeURIComponent(productMatch[1]!);
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(sku)) return json(request, env, { ok: false, code: 'invalid-sku' }, 400);
    const product = await getCatalogueProduct(env, sku);
    if (!product || product.health === 'BLOCKED') return json(request, env, { ok: false, code: 'not-found' }, 404);
    return json(request, env, { ok: true, product }, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=900',
    });
  }

  if (url.pathname === '/quotes' && request.method === 'POST') return handleQuote(request, env);

  const quoteStatusMatch = url.pathname.match(/^\/quotes\/(HOT-Q-\d{4}-\d{6})\/status$/);
  if (quoteStatusMatch && request.method === 'GET') return handleStatus(request, env, quoteStatusMatch[1]!);

  if (url.pathname === '/internal/catalogue/sync' && request.method === 'POST') return handleInternalSync(request, env);
  if (url.pathname === '/internal/outbox/recover' && request.method === 'POST') {
    if (!isInternalRequest(request, env)) return json(request, env, { ok: false, code: 'unauthorized' }, 401);
    const count = await enqueueRecoveryJobs(env);
    return json(request, env, { ok: true, enqueued: count });
  }

  return json(request, env, { ok: false, code: 'not-found' }, 404);
}

async function processQueueMessage(message: Message<QuoteJob>, env: Env): Promise<void> {
  const job: QuoteJob = { ...message.body, attempt: message.attempts };
  const quote = await getQuote(env, job.quoteId);
  if (!quote) {
    console.error('[HOT Price List] queue job references missing quote', { job });
    message.ack();
    return;
  }

  const operational = await getQuoteOperationalStatus(env, job.quoteId);
  const alreadyDone = job.kind === 'billit'
    ? operational?.billit.status === 'success'
    : job.kind === 'attio'
      ? operational?.attio.status === 'success'
      : operational?.admin.status === 'success';
  if (alreadyDone) {
    message.ack();
    return;
  }

  const startedAt = new Date().toISOString();
  await markOutboxAttempt(env, job, message.attempts);

  try {
    let ref: string;
    if (job.kind === 'billit') {
      ref = String(await createBillitOffer(env, `queue:${message.id}`, quote));
    } else if (job.kind === 'attio') {
      ref = await projectQuoteToAttio(env, quote);
    } else {
      ref = await notifyAdmin(env, quote);
    }

    await recordProviderAttempt(env, job, 'success', startedAt, ref);
    await updateProviderStatus(env, job.quoteId, job.kind, 'success', ref);
    message.ack();
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    await recordProviderAttempt(env, job, 'failed', startedAt, undefined, failure);
    await updateProviderStatus(env, job.quoteId, job.kind, 'failed', undefined, failure.message.slice(0, 1000));
    const delaySeconds = Math.min(3600, Math.max(30, 30 * 2 ** Math.min(message.attempts - 1, 6)));
    message.retry({ delaySeconds });
  }
}

async function queueHandler(batch: MessageBatch<QuoteJob>, env: Env): Promise<void> {
  for (const message of batch.messages) await processQueueMessage(message, env);
}

async function scheduledHandler(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil((async () => {
    try {
      await syncCanonicalCatalogue(env, `cron:${controller.scheduledTime}`);
    } catch (error) {
      console.error('[HOT Price List] scheduled catalogue reconciliation failed', error);
    }

    try {
      await enqueueRecoveryJobs(env);
    } catch (error) {
      console.error('[HOT Price List] scheduled outbox recovery failed', error);
    }
  })());
}

export default {
  fetch: fetchHandler,
  queue: queueHandler,
  scheduled: scheduledHandler,
} satisfies ExportedHandler<Env, QuoteJob>;
