import { readdir, readFile, stat } from 'node:fs/promises';

const EXPECTED_PRODUCTS = 145;
const EXPECTED_CATEGORIES = 8;
const PRODUCTION_URL = 'https://houseoftartufo-price-list.vercel.app/';
const JS_BUDGET_BYTES = 250 * 1024;
const CSS_BUDGET_BYTES = 150 * 1024;
const HTML_BUDGET_BYTES = 80 * 1024;
const REQUIRED_IDS = [
  'catalogue',
  'catalogue-search',
  'line-filter',
  'truffle-filter',
  'category-nav',
  'discount-ladder',
  'catalogue-table',
  'product-rows',
  'quote-trigger',
  'quote-dialog',
  'quote-lines',
  'quote-summary',
  'copy-order',
  'whatsapp-order',
  'email-order',
];

function fail(message) {
  throw new Error(`[preview-qa] ${message}`);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function extractIds(html) {
  return [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
}

function extractBody(html) {
  const match = html.match(/<body>[\s\S]*<\/body>/i);
  if (!match) fail('HTML body is missing');
  return match[0].replace(/\s+/g, ' ').trim();
}

function assertRequiredUi(html, label) {
  const ids = extractIds(html);
  if (!unique(ids)) {
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    fail(`${label} contains duplicate HTML id(s): ${duplicates.join(', ')}`);
  }
  for (const id of REQUIRED_IDS) {
    if (!ids.includes(id)) fail(`${label} required UI control #${id} is missing`);
  }
  return ids;
}

async function assetBytes(extension) {
  const assets = new URL('../dist/assets/', import.meta.url);
  const files = (await readdir(assets)).filter((file) => file.endsWith(extension));
  const sizes = await Promise.all(files.map((file) => stat(new URL(file, assets)).then((entry) => entry.size)));
  return sizes.reduce((sum, size) => sum + size, 0);
}

const [sourcePreviewHtml, sourceIndexHtml, builtPreviewHtml, builtIndexHtml, catalogueText, translationText, previewTs, jsBytes, cssBytes] = await Promise.all([
  readFile(new URL('../preview.html', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/preview.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/data/catalog.snapshot.json', import.meta.url), 'utf8'),
  readFile(new URL('../dist/data/translations.snapshot.json', import.meta.url), 'utf8'),
  readFile(new URL('../src/preview.ts', import.meta.url), 'utf8'),
  assetBytes('.js'),
  assetBytes('.css'),
]);

const previewIds = assertRequiredUi(sourcePreviewHtml, 'preview');
const productionIds = assertRequiredUi(sourceIndexHtml, 'production homepage');

if (!/<meta\s+name=["']robots["'][^>]+noindex[^>]*>/i.test(sourcePreviewHtml)) {
  fail('preview must remain noindex until production approval');
}
if (/<meta\s+name=["']robots["'][^>]+noindex[^>]*>/i.test(sourceIndexHtml)) {
  fail('production homepage must not contain noindex metadata');
}
if (!/<meta\s+name=["']robots["'][^>]+index,follow[^>]*>/i.test(sourceIndexHtml)) {
  fail('production homepage robots metadata must be index,follow');
}
if (!sourceIndexHtml.includes(`<link rel="canonical" href="${PRODUCTION_URL}" />`)) {
  fail('production homepage canonical URL is missing or incorrect');
}
if (!sourceIndexHtml.includes(`<meta property="og:url" content="${PRODUCTION_URL}" />`)) {
  fail('production homepage Open Graph URL is missing or incorrect');
}
if (extractBody(sourcePreviewHtml) !== extractBody(sourceIndexHtml)) {
  fail('production homepage buyer UI has drifted from the verified preview body');
}
if (!/<a[^>]+class=["'][^"']*skip-link[^"']*["'][^>]+href=["']#catalogue["']/i.test(sourcePreviewHtml)) {
  fail('skip link to catalogue is missing');
}
if (!/<dialog[^>]+id=["']quote-dialog["']/i.test(sourcePreviewHtml)) {
  fail('semantic quote dialog is missing');
}
if (/\sonclick\s*=/i.test(sourcePreviewHtml) || /\sonclick\s*=/i.test(sourceIndexHtml)) {
  fail('inline onclick handlers are forbidden');
}
if (!builtPreviewHtml.includes('src="/assets/') && !builtPreviewHtml.includes('src="./assets/')) {
  fail('built preview does not reference a bundled application asset');
}
if (!builtIndexHtml.includes('src="/assets/') && !builtIndexHtml.includes('src="./assets/')) {
  fail('built production homepage does not reference a bundled application asset');
}

if (Buffer.byteLength(builtPreviewHtml) > HTML_BUDGET_BYTES) {
  fail(`preview HTML exceeds ${HTML_BUDGET_BYTES / 1024}KB budget`);
}
if (Buffer.byteLength(builtIndexHtml) > HTML_BUDGET_BYTES) {
  fail(`production HTML exceeds ${HTML_BUDGET_BYTES / 1024}KB budget`);
}
if (jsBytes > JS_BUDGET_BYTES) fail(`compiled JavaScript exceeds ${JS_BUDGET_BYTES / 1024}KB budget (${jsBytes} bytes)`);
if (cssBytes > CSS_BUDGET_BYTES) fail(`compiled CSS exceeds ${CSS_BUDGET_BYTES / 1024}KB budget (${cssBytes} bytes)`);

const catalogue = JSON.parse(catalogueText);
if (!Array.isArray(catalogue.products)) fail('catalogue snapshot products are missing');
if (catalogue.products.length !== EXPECTED_PRODUCTS) {
  fail(`expected ${EXPECTED_PRODUCTS} products, found ${catalogue.products.length}`);
}
const categoryCount = new Set(catalogue.products.map((product) => product.categoryId)).size;
if (categoryCount !== EXPECTED_CATEGORIES) {
  fail(`expected ${EXPECTED_CATEGORIES} categories, found ${categoryCount}`);
}
const skus = catalogue.products.map((product) => String(product.sku));
if (!unique(skus)) fail('catalogue snapshot contains duplicate SKUs');
if (catalogue.products.some((product) => !(product.baseUnitPrice > 0) || !(product.unitsPerCase > 0))) {
  fail('catalogue snapshot contains invalid commercial product data');
}

const translations = JSON.parse(translationText);
for (const locale of ['en', 'it', 'fr', 'nl']) {
  if (!translations[locale] || Object.keys(translations[locale]).length === 0) {
    fail(`translation snapshot is missing ${locale}`);
  }
}

if (/class=["'][^"']*box-price/i.test(sourcePreviewHtml) || /data-(?:box|case)-price=/i.test(sourcePreviewHtml)) {
  fail('preview HTML contains an independent hardcoded case-price authority');
}
if (/class=["'][^"']*box-price/i.test(sourceIndexHtml) || /data-(?:box|case)-price=/i.test(sourceIndexHtml)) {
  fail('production HTML contains an independent hardcoded case-price authority');
}
if (!previewTs.includes('calculatePriceBreakdown')) fail('preview is not connected to the canonical pricing engine');
if (!previewTs.includes('loadCatalogue')) fail('preview is not connected to the verified catalogue service');
if (!previewTs.includes('quote.set')) fail('quote flow is not wired');

console.log(
  `[preview-qa] PASS · production / mirrors preview · ${catalogue.products.length} SKUs · ${categoryCount} categories · ${previewIds.length}/${productionIds.length} unique UI ids · JS ${(jsBytes / 1024).toFixed(1)}KB · CSS ${(cssBytes / 1024).toFixed(1)}KB · EN/IT/FR/NL snapshots present`,
);
