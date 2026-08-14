import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const SHOPIFY_PRODUCTS_URL = `${SHOP_ORIGIN}/products.json?limit=250`;
const CATALOGUE_PATH = new URL('../public/data/catalog.snapshot.json', import.meta.url);
const OUTPUT_DIR = new URL('../qa-shopify-audit/', import.meta.url);

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalise(value) {
  return compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bextra[- ]virgin\b/g, ' extra virgin ')
    .replace(/\bflavoured\b/g, ' flavored ')
    .replace(/\bmayonnaise\b/g, ' mayo ')
    .replace(/\bcarpaccio with aroma\b/g, ' carpaccio ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(value) {
  const stop = new Set(['with', 'and', 'of', 'the', 'in', 'made', 'italian', 'gourmet', 'product', 'products']);
  return normalise(value)
    .split(' ')
    .filter((token) => token && !stop.has(token));
}

function tokenScore(a, b) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function measureKey(value) {
  const text = compact(value).toLowerCase().replace(',', '.');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);
  if (!match?.[1] || !match[2]) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  if (match[2] === 'kg') return `${Math.round(amount * 1000)}g`;
  if (match[2] === 'l') return `${Math.round(amount * 1000)}ml`;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${match[2]}`;
}

function percentKey(value) {
  const match = compact(value).replace(',', '.').match(/(\d+(?:\.\d+)?)\s*%/);
  return match?.[1] ? `${Number.parseFloat(match[1])}%` : undefined;
}

function variantText(variant) {
  return [variant.title, variant.public_title, variant.option1, variant.option2, variant.option3, ...(variant.options ?? [])]
    .filter(Boolean)
    .join(' · ');
}

function isNatural(value) {
  return /natural line/i.test(value);
}

function exactVariantMatches(product, catalogueProduct) {
  const wantedMeasure = measureKey(catalogueProduct.sizeLabel);
  const wantedPercent = percentKey(catalogueProduct.name);
  if (!wantedMeasure) return [];

  return (product.variants ?? []).filter((variant) => {
    const text = variantText(variant);
    if (measureKey(text) !== wantedMeasure) return false;
    const variantPercent = percentKey(text);
    if (wantedPercent && variantPercent && variantPercent !== wantedPercent) return false;
    if (wantedPercent && !variantPercent && /(?:sauce|butter|cream|carpaccio|dressing)/i.test(catalogueProduct.name)) return false;
    return true;
  });
}

function candidateScore(catalogueProduct, shopProduct) {
  if (isNatural(catalogueProduct.name) !== isNatural(shopProduct.title)) return 0;
  const c = normalise(catalogueProduct.name);
  const s = normalise(shopProduct.title);
  if (c === s) return 1;
  if (c.replace(/^pure /, '') === s || s.replace(/^pure /, '') === c) return 0.98;
  let score = tokenScore(c, s);

  const cPercent = percentKey(catalogueProduct.name);
  const sPercent = percentKey(shopProduct.title);
  if (cPercent && sPercent && cPercent !== sPercent) score -= 0.35;

  const cTruffle = ['white', 'black', 'summer', 'bianchetto'].filter((word) => c.includes(word));
  const sTruffle = ['white', 'black', 'summer', 'bianchetto'].filter((word) => s.includes(word));
  if (cTruffle.length && sTruffle.length && !cTruffle.some((word) => sTruffle.includes(word))) score -= 0.4;

  return Math.max(0, Math.min(1, score));
}

function classify(catalogueProduct, shopProducts) {
  const candidates = shopProducts
    .map((product) => ({ product, score: candidateScore(catalogueProduct, product) }))
    .filter(({ score }) => score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const strong = candidates.filter(({ score }) => score >= 0.72);
  const evaluated = strong.map(({ product, score }) => ({
    product,
    score,
    variants: exactVariantMatches(product, catalogueProduct),
  }));
  const exact = evaluated.filter((candidate) => candidate.variants.length === 1);

  if (exact.length === 1) {
    const hit = exact[0];
    return {
      status: 'verified',
      handle: hit.product.handle,
      shopifyTitle: hit.product.title,
      variantTitle: hit.variants[0].title,
      siteSku: compact(hit.variants[0].sku) || null,
      score: Number(hit.score.toFixed(3)),
      productUrl: `${SHOP_ORIGIN}/products/${hit.product.handle}`,
      image: hit.product.images?.[0]?.src ?? hit.product.images?.[0] ?? null,
    };
  }

  if (exact.length > 1) {
    return {
      status: 'ambiguous',
      reason: 'multiple-products-with-exact-variant',
      candidates: exact.map(({ product, variants, score }) => ({
        handle: product.handle,
        title: product.title,
        variantTitle: variants[0]?.title ?? null,
        siteSku: compact(variants[0]?.sku) || null,
        score: Number(score.toFixed(3)),
      })),
    };
  }

  if (strong.length) {
    return {
      status: 'no-exact-variant',
      candidates: evaluated.map(({ product, variants, score }) => ({
        handle: product.handle,
        title: product.title,
        matchingVariantCount: variants.length,
        score: Number(score.toFixed(3)),
      })),
    };
  }

  return {
    status: 'no-public-product',
    suggestions: candidates.slice(0, 3).map(({ product, score }) => ({
      handle: product.handle,
      title: product.title,
      score: Number(score.toFixed(3)),
    })),
  };
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response.json();
}

const catalogue = JSON.parse(await readFile(CATALOGUE_PATH, 'utf8'));
const shop = await fetchJson(SHOPIFY_PRODUCTS_URL, 'Shopify public products');
const shopProducts = Array.isArray(shop.products) ? shop.products : [];
if (!shopProducts.length) throw new Error('Shopify public products endpoint returned no products.');

const rows = catalogue.products.map((product) => ({
  catalogueCode: product.sku,
  name: product.name,
  size: product.sizeLabel,
  line: product.line,
  categoryId: product.categoryId,
  ...classify(product, shopProducts),
}));

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] ?? 0) + 1;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  catalogueVersion: catalogue.catalogueVersion,
  catalogueProducts: catalogue.products.length,
  publicShopifyProducts: shopProducts.length,
  counts,
  rows,
  shopifyProducts: shopProducts.map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: compact(variant.sku) || null,
      option1: variant.option1 ?? null,
      option2: variant.option2 ?? null,
      option3: variant.option3 ?? null,
    })),
  })),
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(new URL('catalogue-shopify-audit.json', OUTPUT_DIR), JSON.stringify(report, null, 2), 'utf8');

const csv = [
  ['Catalogue code', 'Name', 'Size', 'Status', 'Shopify title', 'Handle', 'Variant', 'Site SKU'],
  ...rows.map((row) => [
    row.catalogueCode,
    row.name,
    row.size,
    row.status,
    row.shopifyTitle ?? '',
    row.handle ?? '',
    row.variantTitle ?? '',
    row.siteSku ?? '',
  ]),
]
  .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
  .join('\n');
await writeFile(new URL('catalogue-shopify-audit.csv', OUTPUT_DIR), csv, 'utf8');

console.log(`Shopify catalogue audit: ${catalogue.products.length} catalogue rows · ${shopProducts.length} public Shopify products.`);
console.log(`Audit counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' · ')}`);
for (const row of rows.filter((item) => item.status !== 'verified')) {
  const candidateText = (row.candidates ?? row.suggestions ?? []).map((candidate) => `${candidate.title} [${candidate.handle}]`).join(' | ');
  console.log(`AUDIT ${row.catalogueCode} | ${row.name} | ${row.size} | ${row.status}${candidateText ? ` | ${candidateText}` : ''}`);
}
