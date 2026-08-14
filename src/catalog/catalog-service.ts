import { buildStrictOfficialCatalogue } from '../official-catalogue-filter';
import { parseCatalogueSourceCsv, reconcileSourceProduct, sourceRowToProduct } from './price-source';
import { DEFAULT_DISCOUNT_POLICY } from './pricing';
import type { Catalogue } from './types';
import { assertValidCatalogue } from './validation';

export const LIVE_PRODUCTS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vReWkxNwkrVotMwHMpcQRENgkt1cZRmdixrwW10TAHP6Y1In6BZHEbkQu9sI-vikg/pub?gid=86187412&single=true&output=csv';

const SPREADSHEET_ID = '1qqOv6i2UrZZwtbW8awMzawBNs8f9UblGoL25QZf3u94';
const SNAPSHOT_URL = '/data/catalog.snapshot.json';
const CACHE_KEY = 'hot-price-list:catalogue:v2:official-excel-master';
const STALE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LIVE_TIMEOUT_MS = 8_000;

export interface CatalogueLoadResult {
  catalogue: Catalogue;
  warning?: string;
}

function versionFromDate(date: Date): string {
  return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function emitCatalogueError(stage: string, error: unknown): void {
  console.error('[HOT Price List]', {
    event: 'catalogue-load-error',
    stage,
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  });
}

function applyOfficialExcelMaster(catalogue: Catalogue): Catalogue {
  const audit = buildStrictOfficialCatalogue(catalogue.products);
  if (!audit.products.length) throw new Error('Official Excel master produced an empty priced catalogue.');

  if (
    audit.missingPriceVariants.length
    || audit.missingPackVariants.length
    || audit.duplicatePriceRows.length
    || audit.excludedForMissingPack.length
  ) {
    console.warn('[HOT Price List] Official Excel master reconciliation', {
      officialOrderableVariants: audit.products.length,
      missingOfficialPriceRows: audit.missingPriceVariants.map((entry) => `${entry.product} · ${entry.size}`),
      officialVariantsMissingPack: audit.missingPackVariants.map((entry) => `${entry.product} · ${entry.size}`),
      excludedForMissingPack: audit.excludedForMissingPack.map((entry) => `${entry.product} · ${entry.size}`),
      discardedDuplicatePriceRows: audit.duplicatePriceRows,
    });
  }

  return assertValidCatalogue({
    ...catalogue,
    products: audit.products,
    sourceMeta: catalogue.sourceMeta
      ? {
          ...catalogue.sourceMeta,
          sourceRowCount: audit.products.length,
          categoryCount: new Set(audit.products.map((product) => product.categoryId)).size,
        }
      : catalogue.sourceMeta,
  });
}

function assertContainsBaseline(candidate: Catalogue, baseline: Catalogue): void {
  const candidateSkus = new Set(candidate.products.map((product) => product.sku));
  const missing = baseline.products
    .map((product) => product.sku)
    .filter((sku) => !candidateSkus.has(sku));

  if (missing.length > 0) {
    throw new Error(
      `Catalogue is incomplete versus verified build snapshot: ${missing.length} SKU(s) missing (${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', …' : ''}).`,
    );
  }
}

function getStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    return window.localStorage;
  } catch (error) {
    emitCatalogueError('storage-access', error);
    return undefined;
  }
}

function cacheVerifiedCatalogue(catalogue: Catalogue): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(catalogue));
  } catch (error) {
    emitCatalogueError('cache-write', error);
  }
}

function readStaleCatalogue(baseline?: Catalogue): Catalogue | undefined {
  const storage = getStorage();
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Catalogue;
    const verifiedAt = Date.parse(parsed.verifiedAt);
    if (!Number.isFinite(verifiedAt) || Date.now() - verifiedAt > STALE_MAX_AGE_MS) {
      storage.removeItem(CACHE_KEY);
      return undefined;
    }

    const stale = applyOfficialExcelMaster(assertValidCatalogue({
      ...parsed,
      freshness: 'stale',
    }));
    if (baseline) assertContainsBaseline(stale, baseline);
    return stale;
  } catch (error) {
    emitCatalogueError('cache-read', error);
    try {
      storage.removeItem(CACHE_KEY);
    } catch (removeError) {
      emitCatalogueError('cache-clear', removeError);
    }
    return undefined;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadLiveCatalogue(baseline?: Catalogue): Promise<Catalogue> {
  const response = await fetchWithTimeout(`${LIVE_PRODUCTS_URL}&t=${Date.now()}`, LIVE_TIMEOUT_MS);
  if (!response.ok) throw new Error(`Live PRODUCTS source returned HTTP ${response.status}.`);

  const rows = parseCatalogueSourceCsv(await response.text());
  const issues = rows.flatMap(reconcileSourceProduct);
  if (issues.length > 0) {
    const first = issues[0];
    throw new Error(
      `Live source reconciliation failed with ${issues.length} issue(s). First: SKU ${first?.sku ?? '?'} ${first?.field ?? '?'}.`,
    );
  }

  const now = new Date();
  const products = rows.map(sourceRowToProduct);
  const catalogue = applyOfficialExcelMaster(assertValidCatalogue({
    schemaVersion: 1,
    catalogueVersion: versionFromDate(now),
    currency: 'EUR',
    updatedAt: now.toISOString(),
    verifiedAt: now.toISOString(),
    source: 'google-sheet',
    freshness: 'fresh',
    products,
    discountPolicy: [...DEFAULT_DISCOUNT_POLICY],
    sourceMeta: {
      spreadsheetId: SPREADSHEET_ID,
      sheet: 'PRODUCTS',
      sourceRowCount: products.length,
      categoryCount: new Set(products.map((product) => product.categoryId)).size,
    },
  }));

  if (baseline) assertContainsBaseline(catalogue, baseline);
  return catalogue;
}

async function loadBuildSnapshot(): Promise<Catalogue> {
  const response = await fetch(SNAPSHOT_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Catalogue fallback snapshot returned HTTP ${response.status}.`);

  const parsed = (await response.json()) as Catalogue;
  return applyOfficialExcelMaster(assertValidCatalogue({
    ...parsed,
    source: 'snapshot',
    freshness: 'fallback',
  }));
}

export async function loadCatalogue(): Promise<CatalogueLoadResult> {
  let baseline: Catalogue | undefined;
  let baselineError: unknown;
  try {
    baseline = await loadBuildSnapshot();
  } catch (error) {
    baselineError = error;
    emitCatalogueError('baseline-snapshot', error);
  }

  try {
    const live = await loadLiveCatalogue(baseline);
    cacheVerifiedCatalogue(live);
    return { catalogue: live };
  } catch (liveError) {
    emitCatalogueError('live-source', liveError);

    const stale = readStaleCatalogue(baseline);
    if (stale) {
      return { catalogue: stale };
    }

    if (baseline) {
      return { catalogue: baseline };
    }

    const liveMessage = liveError instanceof Error ? liveError.message : String(liveError);
    const fallbackMessage = baselineError instanceof Error ? baselineError.message : String(baselineError ?? 'unavailable');
    throw new Error(`Catalogue unavailable. Live: ${liveMessage} Fallback: ${fallbackMessage}`);
  }
}
