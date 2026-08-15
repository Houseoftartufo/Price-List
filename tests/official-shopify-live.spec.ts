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

interface NodeLikeGlobal {
  process?: {
    env?: Record<string, string | undefined>;
  };
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const runLive = (globalThis as NodeLikeGlobal).process?.env?.CI_SHOPIFY_LIVE === '1';
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

    expect(byHandle.size).toBe(7);
    const failures: string[] = [];

    for (const [handle, expected] of byHandle) {
      let product: ShopifyProduct;
      try {
        product = await fetchProduct(handle);
      } catch (error) {
        failures.push(`${handle}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }

      if (product.handle !== handle) {
        failures.push(`${handle}: returned handle ${String(product.handle ?? 'missing')}`);
        continue;
      }

      const variants = product.variants ?? [];
      if (!variants.length) {
        failures.push(`${handle}: no variants returned`);
        continue;
      }

      for (const [officialKey, expectedSku] of expected) {
        const matches = variants.filter((variant) => String(variant.sku ?? '').trim() === expectedSku);
        if (matches.length !== 1) {
          const available = variants.map((variant) => String(variant.sku ?? '').trim()).filter(Boolean).join(', ');
          failures.push(`${officialKey} -> ${handle} -> ${expectedSku}: matches=${matches.length}; available=[${available}]`);
        }
      }

      await sleep(350);
    }

    expect(failures, failures.join('\n')).toEqual([]);
  }, 60_000);
});
