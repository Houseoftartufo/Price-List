import { describe, expect, it } from 'vitest';
import { assertPublicCatalogue, assertSyncResult, extractLatestVersionId, versionPreviewUrl } from '../scripts/shadow-preflight.mjs';

describe('shadow activation preflight', () => {
  it('resolves the newest Wrangler version and its deterministic preview URL', () => {
    const id = extractLatestVersionId([{ id: '4bdb4614-c98b-454f-aa20-9369ab1dd64f' }]);
    expect(id).toBe('4bdb4614-c98b-454f-aa20-9369ab1dd64f');
    expect(versionPreviewUrl(id, 'hot-price-list-api', 'house-of-tartufo')).toBe(
      'https://4bdb4614-hot-price-list-api.house-of-tartufo.workers.dev',
    );
  });

  it('refuses a sync that produced no buyer-visible Billit products', () => {
    expect(() => assertSyncResult({ ok: true, total: 4, ready: 0, warning: 0, blocked: 4 })).toThrow(/buyer-visible/i);
    expect(() => assertSyncResult({ ok: true, total: 0, ready: 0, warning: 0, blocked: 0 })).toThrow(/empty/i);
  });

  it('refuses an empty or invalid public catalogue before quote activation', () => {
    expect(() => assertPublicCatalogue({ ok: true, products: [] })).toThrow(/empty/i);
    expect(() => assertPublicCatalogue({ ok: true, products: [{ sku: 'x', basePriceExVat: 0, health: 'READY' }] })).toThrow(/invalid fiscal price/i);
    expect(() => assertPublicCatalogue({ ok: true, products: [{ sku: 'x', basePriceExVat: 8.5, health: 'READY' }] })).not.toThrow();
  });
});
