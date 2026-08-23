import { shopifyApiVersion, type Env } from '../env';
import type { AvailabilityState, Locale, ShopifyProductEnrichment } from '../types';

interface ShopifyGraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

const PRODUCT_QUERY = `#graphql
query HotPriceListProducts($cursor: String) {
  products(first: 50, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id
      title
      handle
      status
      updatedAt
      descriptionHtml
      fr: translations(locale: "fr") { key value outdated }
      it: translations(locale: "it") { key value outdated }
      nl: translations(locale: "nl") { key value outdated }
      de: translations(locale: "de") { key value outdated }
      media(first: 10) {
        nodes {
          ... on MediaImage {
            image { url width height }
            alt
          }
        }
      }
      metafields(first: 40) { nodes { namespace key type value } }
      variants(first: 100) {
        nodes {
          id
          title
          sku
          availableForSale
          inventoryQuantity
          selectedOptions { name value }
          media(first: 5) {
            nodes {
              ... on MediaImage {
                image { url width height }
                alt
              }
            }
          }
          metafields(first: 30) { nodes { namespace key type value } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

let cachedToken: { token: string; expiresAt: number } | undefined;

function normalizeShopDomain(value: string): string {
  const stripped = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const domain = stripped.endsWith('.myshopify.com') ? stripped : `${stripped}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) throw new Error('Invalid Shopify shop domain.');
  return domain;
}

async function accessToken(env: Env): Promise<string> {
  if (env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim()) return env.SHOPIFY_ADMIN_ACCESS_TOKEN.trim();
  const clientId = env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Shopify credentials are not configured.');

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;
  const domain = normalizeShopDomain(env.SHOPIFY_SHOP_DOMAIN);
  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!response.ok) throw new Error(`Shopify token request failed with HTTP ${response.status}.`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error('Shopify token response missing access_token.');
  cachedToken = {
    token: payload.access_token,
    expiresAt: now + Math.max(300, Number(payload.expires_in) || 86_400) * 1000,
  };
  return cachedToken.token;
}

async function graphql<T>(env: Env, query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = normalizeShopDomain(env.SHOPIFY_SHOP_DOMAIN);
  const token = await accessToken(env);
  const response = await fetch(`https://${domain}/admin/api/${shopifyApiVersion(env)}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify Admin GraphQL HTTP ${response.status}.`);
  const payload = await response.json() as ShopifyGraphqlResponse<T>;
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message || 'Shopify GraphQL error').join('; '));
  if (!payload.data) throw new Error('Shopify GraphQL returned no data.');
  return payload.data;
}

function metafieldValue(fields: Array<{ namespace: string; key: string; value: string }>, key: string): string | undefined {
  return fields.find((field) => field.namespace === 'hot' && field.key === key)?.value?.trim() || undefined;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function firstImage(nodes: Array<{ image?: { url?: string } | null }>): string | undefined {
  return nodes.find((node) => node.image?.url)?.image?.url;
}

function inferSizeLabel(selectedOptions: Array<{ name: string; value: string }>, variantTitle: string): string | undefined {
  const option = selectedOptions.find((item) => !/^title$/i.test(item.name) && !/^default title$/i.test(item.value));
  if (option?.value?.trim()) return option.value.trim();
  return variantTitle && variantTitle !== 'Default Title' ? variantTitle : undefined;
}

type Translation = { key: string; value?: string | null; outdated: boolean };

function translatedContent(entries: Translation[]): { title?: string; description?: string } {
  const current = (key: string): string | undefined => {
    const entry = entries.find((item) => item.key === key && !item.outdated);
    return entry?.value?.trim() || undefined;
  };
  const title = current('title');
  const description = current('body_html');
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

function localizedContent(product: {
  title: string;
  descriptionHtml: string;
  fr: Translation[];
  it: Translation[];
  nl: Translation[];
  de: Translation[];
}): NonNullable<ShopifyProductEnrichment['localized']> {
  const englishTitle = product.title.trim();
  const englishDescription = product.descriptionHtml.trim();
  return {
    en: {
      ...(englishTitle ? { title: englishTitle } : {}),
      ...(englishDescription ? { description: englishDescription } : {}),
    },
    fr: translatedContent(product.fr),
    it: translatedContent(product.it),
    nl: translatedContent(product.nl),
    de: translatedContent(product.de),
  };
}

export function availabilityState(availableForSale: boolean, inventoryQuantity?: number): AvailabilityState {
  if (!availableForSale) return 'OUT_OF_STOCK';
  if (typeof inventoryQuantity !== 'number') return 'IN_STOCK';
  if (inventoryQuantity <= 0) return 'OUT_OF_STOCK';
  if (inventoryQuantity <= 6) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export async function listShopifyEnrichment(env: Env): Promise<ShopifyProductEnrichment[]> {
  type Node = {
    id: string; title: string; handle: string; status: string; updatedAt: string; descriptionHtml: string;
    fr: Translation[]; it: Translation[]; nl: Translation[]; de: Translation[];
    media: { nodes: Array<{ image?: { url?: string } | null }> };
    metafields: { nodes: Array<{ namespace: string; key: string; type: string; value: string }> };
    variants: { nodes: Array<{
      id: string; title: string; sku?: string | null; availableForSale: boolean; inventoryQuantity?: number | null;
      selectedOptions: Array<{ name: string; value: string }>;
      media: { nodes: Array<{ image?: { url?: string } | null }> };
      metafields: { nodes: Array<{ namespace: string; key: string; type: string; value: string }> };
    }> };
  };
  type Result = { products: { nodes: Node[]; pageInfo: { hasNextPage: boolean; endCursor?: string | null } } };

  const output: ShopifyProductEnrichment[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 50; page += 1) {
    const result: Result = await graphql<Result>(env, PRODUCT_QUERY, { cursor });
    for (const product of result.products.nodes) {
      if (product.status !== 'ACTIVE') continue;
      const localized = localizedContent(product);
      for (const variant of product.variants.nodes) {
        const sku = variant.sku?.trim();
        if (!sku) continue;

        const unitsPerCase = parsePositiveInteger(
          metafieldValue(variant.metafields.nodes, 'units_per_case') || metafieldValue(product.metafields.nodes, 'units_per_case'),
        );
        const imageUrl = firstImage(variant.media.nodes) ?? firstImage(product.media.nodes);
        const sizeLabel = inferSizeLabel(variant.selectedOptions, variant.title);
        const ingredients = metafieldValue(product.metafields.nodes, 'ingredients');
        const storage = metafieldValue(product.metafields.nodes, 'storage');
        const usage = metafieldValue(product.metafields.nodes, 'usage');

        output.push({
          productId: product.id,
          variantId: variant.id,
          sku,
          handle: product.handle,
          title: product.title,
          availableForSale: variant.availableForSale,
          ...(typeof variant.inventoryQuantity === 'number' ? { inventoryQuantity: variant.inventoryQuantity } : {}),
          ...(imageUrl ? { imageUrl } : {}),
          ...(sizeLabel ? { sizeLabel } : {}),
          ...(unitsPerCase ? { unitsPerCase } : {}),
          ...(ingredients ? { ingredients } : {}),
          ...(storage ? { storage } : {}),
          ...(usage ? { usage } : {}),
          localized,
          updatedAt: product.updatedAt,
        });
      }
    }
    if (!result.products.pageInfo.hasNextPage) return output;
    cursor = result.products.pageInfo.endCursor || null;
    if (!cursor) throw new Error('Shopify pagination expected endCursor.');
  }
  throw new Error('Shopify product pagination exceeded safety limit.');
}

export async function fetchLocalizedStorefrontContent(
  enrichment: ShopifyProductEnrichment,
  locale: Locale,
): Promise<{ title?: string; description?: string } | undefined> {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const response = await fetch(`https://houseoftartufo.com${prefix}/products/${encodeURIComponent(enrichment.handle)}.json`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return undefined;
  const payload = await response.json() as { product?: { title?: string; body_html?: string; variants?: Array<{ sku?: string }> } };
  const product = payload.product;
  if (!product?.variants?.some((variant) => variant.sku?.trim() === enrichment.sku)) return undefined;
  return {
    ...(product.title?.trim() ? { title: product.title.trim() } : {}),
    ...(product.body_html?.trim() ? { description: product.body_html.trim() } : {}),
  };
}
