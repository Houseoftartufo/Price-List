import { readFile } from 'node:fs/promises';

const AUDIT_PATH = new URL('../qa-shopify-audit/catalogue-shopify-audit.json', import.meta.url);
const MAP_PATH = new URL('../src/product-detail-map.ts', import.meta.url);

const audit = JSON.parse(await readFile(AUDIT_PATH, 'utf8'));
const source = await readFile(MAP_PATH, 'utf8');

const mapBlock = source.match(/VERIFIED_PRODUCT_DETAIL_MAP[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1];
if (!mapBlock) throw new Error('Product detail map: VERIFIED_PRODUCT_DETAIL_MAP block not found.');

const entries = new Map();
const entryPattern = /['"](\d+)['"]\s*:\s*\{([\s\S]*?)\n\s*\},/g;
for (const match of mapBlock.matchAll(entryPattern)) {
  const code = match[1];
  const body = match[2] ?? '';
  const handle = body.match(/handle:\s*['"]([^'"]+)['"]/)?.[1];
  const siteSku = body.match(/siteSku:\s*['"]([^'"]+)['"]/)?.[1];
  if (!code || !handle || !siteSku) throw new Error(`Product detail map: incomplete entry for catalogue code ${code ?? '?'}.`);
  if (entries.has(code)) throw new Error(`Product detail map: duplicate catalogue code ${code}.`);
  entries.set(code, { handle, siteSku });
}

const verifiedRows = audit.rows.filter((row) => row.status === 'verified');
if (entries.size !== verifiedRows.length) {
  throw new Error(`Product detail map coverage mismatch: map=${entries.size}, Shopify audit verified=${verifiedRows.length}.`);
}

const failures = [];
for (const row of verifiedRows) {
  const mapped = entries.get(String(row.catalogueCode));
  if (!mapped) {
    failures.push(`missing code ${row.catalogueCode} (${row.name} ${row.size})`);
    continue;
  }
  if (mapped.handle !== row.handle) failures.push(`code ${row.catalogueCode}: handle ${mapped.handle} != ${row.handle}`);
  if (mapped.siteSku !== row.siteSku) failures.push(`code ${row.catalogueCode}: site SKU ${mapped.siteSku} != ${row.siteSku}`);
}

for (const [code] of entries) {
  if (!verifiedRows.some((row) => String(row.catalogueCode) === code)) failures.push(`code ${code}: mapped but not verified by Shopify audit`);
}

if (failures.length) {
  throw new Error(`Product detail map does not match Shopify audit:\n- ${failures.join('\n- ')}`);
}

console.log(`Verified product detail map: ${entries.size}/${audit.catalogueProducts} catalogue rows have an exact public Shopify variant; every verified audit row is mapped with the exact handle and site SKU.`);
