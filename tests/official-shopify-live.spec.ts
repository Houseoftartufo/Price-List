import { describe, expect, it } from 'vitest';
import { OFFICIAL_SHOPIFY_MAP } from '../src/official-shopify-map';

interface ShopifyVariant {
  sku?: string | null;
  title?: string;
  public_title?: string | null;
}

interface ShopifyProduct {
  handle?: string;
  variants?: ShopifyVariant[];
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const runLive = process.env.CI_SHOPIFY_LIVE === '1';
const liveDescribe = runLive ? describe : describe.skip;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchProduct(handle: string): Promise<ShopifyProduct> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${SHOP_ORIGIN}/products/${handle}.js`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return (await response.json()) as ShopifyProduct;
      lastError = new Error(`${handle}: HTTP ${response.status}`);
      if (response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(1200 * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error(`${handle}: Shopify fetch failed.`);
}

liveDescribe('official Shopify enrichment live gate', () => {
  it('keeps every mapped SKU attached to exactly one current Shopify variant', async () => {
    const byHandle = new Map<string, Array<[string, string]>>();
    for (const [officialKey, mapping] of Object.entries(OFFICIAL_SHOPIFY_MAP)) {
      const list = byHandle.get(mapping.handle) ?? [];
      list.push([officialKey, mapping.siteSku]);
      byHandle.set(mapping.handle, list);
    }

    expect(byHandle.size).toBe(6);

    for (const [handle, expected] of byHandle) {
      const product = await fetchProduct(handle);
      expect(product.handle, handle).toBe(handle);
      const variants = product.variants ?? [];
      expect(variants.length, `${handle}: variants`).toBeGreaterThan(0);

      for (const [officialKey, expectedSku] of expected) {
        const matches = variants.filter((variant) => String(variant.sku ?? '').trim() === expectedSku);
        expect(matches, `${officialKey} -> ${handle} -> ${expectedSku}`).toHaveLength(1);
      }

      await sleep(350);
    }
  }, 60_000);
});
