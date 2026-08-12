import { parseCatalogueSourceCsv, reconcileSourceProduct, sourceRowToProduct } from './price-source';
import { DEFAULT_DISCOUNT_POLICY } from './pricing';
import type { Catalogue } from './types';
import { assertValidCatalogue } from './validation';

export const LIVE_PRODUCTS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vReWkxNwkrVotMwHMpcQRENgkt1cZRmdixrwW10TAHP6Y1In6BZHEbkQu9sI-vikg/pub?gid=86187412&single=true&output=csv';

const SPREADSHEET_ID = '1qqOv6i2UrZZwtbW8awMzawBNs8f9UblGoL25QZf3u94';
const SNAPSHOT_URL = '/data/catalog.snapshot.json';
const CACHE_KEY = 'hot-price-list:catalogue:v1';
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

function readStaleCatalogue(): Catalogue | undefined {
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

    const stale: Catalogue = {
      ...parsed,
      freshness: 'stale',
    };
    return assertValidCatalogue(stale);
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

async function loadLiveCatalogue(): Promise<Catalogue> {
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
  const catalogue: Catalogue = {
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
  };

  return assertValidCatalogue(catalogue);
}

async function loadBuildSnapshot(): Promise<Catalogue> {
  const response = await fetch(SNAPSHOT_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Catalogue fallback snapshot returned HTTP ${response.status}.`);

  const parsed = (await response.json()) as Catalogue;
  const fallback: Catalogue = {
    ...parsed,
    source: 'snapshot',
    freshness: 'fallback',
  };
  return assertValidCatalogue(fallback);
}

export async function loadCatalogue(): Promise<CatalogueLoadResult> {
  try {
    const live = await loadLiveCatalogue();
    cacheVerifiedCatalogue(live);
    return { catalogue: live };
  } catch (liveError) {
    emitCatalogueError('live-source', liveError);

    const stale = readStaleCatalogue();
    if (stale) {
      return {
        catalogue: stale,
        warning: 'Live prices could not be refreshed. Showing the most recent verified prices saved on this device.',
      };
    }

    try {
      const fallback = await loadBuildSnapshot();
      return {
        catalogue: fallback,
        warning: 'Live prices could not be refreshed. Showing the last build-time verified catalogue snapshot.',
      };
    } catch (snapshotError) {
      emitCatalogueError('fallback-snapshot', snapshotError);
      const liveMessage = liveError instanceof Error ? liveError.message : String(liveError);
      const fallbackMessage = snapshotError instanceof Error ? snapshotError.message : String(snapshotError);
      throw new Error(`Catalogue unavailable. Live: ${liveMessage} Fallback: ${fallbackMessage}`);
    }
  }
}
