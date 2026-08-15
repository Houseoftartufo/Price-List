import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';

const API_VERSION = '2026-07';
const MASTER_SKUS = new Set(OFFICIAL_PRODUCT_VARIANTS.map((entry) => entry.sku));
const MAX_PAGES = 10;

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | undefined;

interface ShopifyImage {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

interface ShopifyMediaNode {
  id: string;
  alt?: string | null;
  image?: {
    url: string;
    width?: number | null;
    height?: number | null;
  } | null;
}

interface ShopifyMetafield {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

interface ShopifyVariantNode {
  id: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  price: string;
  compareAtPrice?: string | null;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
  media: { nodes: ShopifyMediaNode[] };
  metafields: { nodes: ShopifyMetafield[] };
}

interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string[];
  updatedAt: string;
  descriptionHtml: string;
  onlineStoreUrl?: string | null;
  media: { nodes: ShopifyMediaNode[] };
  metafields: { nodes: ShopifyMetafield[] };
  variants: { nodes: ShopifyVariantNode[] };
}

interface ProductsPage {
  data?: {
    products?: {
      nodes: ShopifyProductNode[];
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    };
  };
  errors?: Array<{ message?: string }>;
}

const PRODUCTS_QUERY = `#graphql
  query PriceListProducts($cursor: String) {
    products(first: 100, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        tags
        updatedAt
        descriptionHtml
        onlineStoreUrl
        media(first: 10) {
          nodes {
            ... on MediaImage {
              id
              alt
              image { url width height }
            }
          }
        }
        metafields(first: 100) {
          nodes { namespace key type value }
        }
        variants(first: 100) {
          nodes {
            id
            title
            sku
            barcode
            price
            compareAtPrice
            availableForSale
            selectedOptions { name value }
            media(first: 5) {
              nodes {
                ... on MediaImage {
                  id
                  alt
                  image { url width height }
                }
              }
            }
            metafields(first: 50) {
              nodes { namespace key type value }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function env(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name]?.trim() || undefined : undefined;
}

function normalizeShopDomain(value: string): string {
  const stripped = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const domain = stripped.endsWith('.myshopify.com') ? stripped : `${stripped}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new Error('SHOPIFY_SHOP_DOMAIN must be a valid *.myshopify.com domain.');
  }
  return domain;
}

async function accessToken(shopDomain: string): Promise<string> {
  const direct = env('SHOPIFY_ADMIN_ACCESS_TOKEN');
  if (direct) return direct;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;

  const clientId = env('SHOPIFY_CLIENT_ID');
  const clientSecret = env('SHOPIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Shopify credentials are not configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Shopify token request failed with HTTP ${response.status}.`);

  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('Shopify token response did not include access_token.');
  const ttlSeconds = Number.isFinite(json.expires_in) ? Number(json.expires_in) : 24 * 60 * 60;
  cachedToken = {
    token: json.access_token,
    expiresAt: now + Math.max(300, ttlSeconds) * 1000,
  };
  return json.access_token;
}

function safeMetafieldRules(): string[] {
  const configured = env('SHOPIFY_METAFIELD_ALLOWLIST');
  if (!configured) return [];
  return configured.split(',').map((value) => value.trim()).filter(Boolean);
}

function exposeMetafield(field: ShopifyMetafield, rules: readonly string[]): boolean {
  if (rules.includes('*')) return true;
  return rules.some((rule) => {
    const [namespace, key] = rule.split('.');
    if (!namespace || !key) return false;
    return namespace === field.namespace && (key === '*' || key === field.key);
  });
}

function mediaImages(nodes: readonly ShopifyMediaNode[]): ShopifyImage[] {
  return nodes.flatMap((node) => node.image?.url ? [{
    url: node.image.url,
    alt: node.alt ?? null,
    width: node.image.width ?? null,
    height: node.image.height ?? null,
  }] : []);
}

async function fetchProducts(shopDomain: string, token: string): Promise<ShopifyProductNode[]> {
  const output: ShopifyProductNode[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(`https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { cursor } }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Shopify Admin GraphQL returned HTTP ${response.status}.`);

    const json = await response.json() as ProductsPage;
    if (json.errors?.length) {
      throw new Error(`Shopify Admin GraphQL error: ${json.errors.map((error) => error.message || 'unknown').join('; ')}`);
    }
    const products = json.data?.products;
    if (!products) throw new Error('Shopify Admin GraphQL returned no products payload.');
    output.push(...products.nodes);
    if (!products.pageInfo.hasNextPage) return output;
    cursor = products.pageInfo.endCursor ?? null;
    if (!cursor) throw new Error('Shopify pagination expected an endCursor but none was returned.');
  }

  throw new Error(`Shopify product pagination exceeded ${MAX_PAGES} pages.`);
}

function sanitizeProducts(products: readonly ShopifyProductNode[]) {
  const metafieldRules = safeMetafieldRules();
  const matchedSkus = new Set<string>();

  const sanitized = products.flatMap((product) => {
    const variants = product.variants.nodes.flatMap((variant) => {
      const sku = variant.sku?.trim();
      if (!sku || !MASTER_SKUS.has(sku)) return [];
      matchedSkus.add(sku);
      return [{
        id: variant.id,
        title: variant.title,
        sku,
        barcode: variant.barcode?.trim() || null,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice ?? null,
        availableForSale: variant.availableForSale,
        selectedOptions: variant.selectedOptions,
        media: mediaImages(variant.media.nodes),
        metafields: variant.metafields.nodes.filter((field) => exposeMetafield(field, metafieldRules)),
      }];
    });
    if (!variants.length) return [];

    return [{
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      updatedAt: product.updatedAt,
      descriptionHtml: product.descriptionHtml,
      onlineStoreUrl: product.onlineStoreUrl ?? null,
      media: mediaImages(product.media.nodes),
      metafields: product.metafields.nodes.filter((field) => exposeMetafield(field, metafieldRules)),
      variants,
    }];
  });

  return {
    products: sanitized,
    matchedSkus: [...matchedSkus].sort(),
    missingMasterSkus: [...MASTER_SKUS].filter((sku) => !matchedSkus.has(sku)).sort(),
  };
}

function json(body: unknown, status = 200, cache = false): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cache ? 'public, s-maxage=120, stale-while-revalidate=600' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

    const configuredShop = env('SHOPIFY_SHOP_DOMAIN');
    if (!configuredShop) {
      return json({
        available: false,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        reason: 'not-configured',
      }, 503);
    }

    try {
      const shopDomain = normalizeShopDomain(configuredShop);
      const token = await accessToken(shopDomain);
      const rawProducts = await fetchProducts(shopDomain, token);
      const sanitized = sanitizeProducts(rawProducts);
      return json({
        available: true,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        fetchedAt: new Date().toISOString(),
        shopDomain,
        masterSkuCount: MASTER_SKUS.size,
        ...sanitized,
      }, 200, true);
    } catch (error) {
      console.error('[HOT Price List] Shopify live API error', error);
      return json({
        available: false,
        source: 'shopify-admin-graphql',
        apiVersion: API_VERSION,
        reason: 'upstream-error',
      }, 502);
    }
  },
};
