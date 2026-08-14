import { describe, expect, it } from 'vitest';

interface ShopifyVariant {
  sku?: string | null;
  title?: string;
  public_title?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface ShopifyImage {
  src?: string;
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  variants?: ShopifyVariant[];
  images?: Array<string | ShopifyImage>;
}

interface NodeLikeGlobal {
  process?: { env?: Record<string, string | undefined> };
}

const runLive = (globalThis as NodeLikeGlobal).process?.env?.CI_SHOPIFY_DISCOVERY === '1';
const liveDescribe = runLive ? describe : describe.skip;
const SHOP_ORIGIN = 'https://houseoftartufo.com';

const CANDIDATE_HANDLES = [
  'black-truffle-sauce',
  'truffled-sauce-summer-truffle-5',
  'truffled-sauce-summer-truffle-10',
  'white-truffle-sauce',
  'white-truffled-sauce-bianchetto-truffle-2',
  'tartufata-white-sauce-with-bianchetto-2',
  'truffle-mayonnaise',
  'vegan-black-truffle-mayonnaise',
  'truffle-ketchup',
  'porcini-mushroom-cream-with-summer-truffle',
  'summer-truffle-carpaccio',
  'butter-with-summer-truffle-3',
  'white-truffle-butter',
  'truffle-cashews',
  'truffle-almonds',
  'truffle-walnuts',
  'sea-salt-with-white-truffle',
  'grey-salt-with-truffle',
  'himalayan-pink-salt-with-truffle',
  'spicy-truffle-sauce',
  'polenta-with-summer-truffle',
  'truffle-risotto',
  'genovese-pesto',
  'acacia-honey-with-truffle',
  'white-truffle-extra-virgin-olive-oil',
  'parfumed-white-truffle-extra-virgin-olive-oil',
  'black-truffle-extra-virgin-olive-oil',
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchProduct(handle: string): Promise<{ status: number; product?: ShopifyProduct }> {
  const response = await fetch(`${SHOP_ORIGIN}/products/${handle}.js`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return { status: response.status };
  return { status: response.status, product: (await response.json()) as ShopifyProduct };
}

liveDescribe('official Shopify candidate discovery', () => {
  it('prints the live Shopify variant inventory for handles supplied by the official cross-check workbook', async () => {
    const records: Array<Record<string, unknown>> = [];

    for (const handle of CANDIDATE_HANDLES) {
      try {
        const result = await fetchProduct(handle);
        const product = result.product;
        records.push({
          handle,
          status: result.status,
          title: product?.title ?? null,
          image: typeof product?.images?.[0] === 'string' ? product.images[0] : product?.images?.[0]?.src ?? null,
          variants: (product?.variants ?? []).map((variant) => ({
            title: variant.title ?? null,
            publicTitle: variant.public_title ?? null,
            option1: variant.option1 ?? null,
            option2: variant.option2 ?? null,
            option3: variant.option3 ?? null,
            sku: String(variant.sku ?? '').trim() || null,
          })),
        });
      } catch (error) {
        records.push({ handle, status: 'fetch-error', error: error instanceof Error ? error.message : String(error) });
      }
      await sleep(250);
    }

    console.log(`OFFICIAL_SHOPIFY_DISCOVERY=${JSON.stringify(records)}`);
    expect(records).toHaveLength(CANDIDATE_HANDLES.length);
  }, 90_000);
});
