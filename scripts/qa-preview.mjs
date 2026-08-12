import { readFile } from 'node:fs/promises';

const EXPECTED_PRODUCTS = 145;
const EXPECTED_CATEGORIES = 8;
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

const [sourceHtml, builtHtml, catalogueText, translationText, previewTs] = await Promise.all([
  readFile(new URL('../preview.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/preview.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/data/catalog.snapshot.json', import.meta.url), 'utf8'),
  readFile(new URL('../dist/data/translations.snapshot.json', import.meta.url), 'utf8'),
  readFile(new URL('../src/preview.ts', import.meta.url), 'utf8'),
]);

const ids = [...sourceHtml.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
if (!unique(ids)) {
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  fail(`duplicate HTML id(s): ${duplicates.join(', ')}`);
}

for (const id of REQUIRED_IDS) {
  if (!ids.includes(id)) fail(`required UI control #${id} is missing`);
}

if (!/<meta\s+name=["']robots["'][^>]+noindex[^>]*>/i.test(sourceHtml)) {
  fail('preview must remain noindex until production approval');
}
if (!/<a[^>]+class=["'][^"']*skip-link[^"']*["'][^>]+href=["']#catalogue["']/i.test(sourceHtml)) {
  fail('skip link to catalogue is missing');
}
if (!/<dialog[^>]+id=["']quote-dialog["']/i.test(sourceHtml)) {
  fail('semantic quote dialog is missing');
}
if (/\sonclick\s*=/i.test(sourceHtml)) fail('inline onclick handlers are forbidden');
if (!builtHtml.includes('src="/assets/') && !builtHtml.includes('src="./assets/')) {
  fail('built preview does not reference a bundled application asset');
}

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

if (/class=["'][^"']*box-price/i.test(sourceHtml) || /data-(?:box|case)-price=/i.test(sourceHtml)) {
  fail('preview HTML contains an independent hardcoded case-price authority');
}
if (!previewTs.includes('calculatePriceBreakdown')) fail('preview is not connected to the canonical pricing engine');
if (!previewTs.includes('loadCatalogue')) fail('preview is not connected to the verified catalogue service');
if (!previewTs.includes('quote.set')) fail('quote flow is not wired');

console.log(
  `[preview-qa] PASS · ${catalogue.products.length} SKUs · ${categoryCount} categories · ${ids.length} unique UI ids · EN/IT/FR/NL snapshots present`,
);
