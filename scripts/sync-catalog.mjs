import { mkdir, writeFile } from 'node:fs/promises';

const PRODUCTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReWkxNwkrVotMwHMpcQRENgkt1cZRmdixrwW10TAHP6Y1In6BZHEbkQu9sI-vikg/pub?gid=86187412&single=true&output=csv';
const TRANSLATIONS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReWkxNwkrVotMwHMpcQRENgkt1cZRmdixrwW10TAHP6Y1In6BZHEbkQu9sI-vikg/pub?gid=29668113&single=true&output=csv';
const SPREADSHEET_ID = '1qqOv6i2UrZZwtbW8awMzawBNs8f9UblGoL25QZf3u94';
const OUTPUT_DIR = new URL('../public/data/', import.meta.url);

const DISCOUNT_POLICY = [
  { minCases: 1, discountRate: 0 },
  { minCases: 2, discountRate: 0.05 },
  { minCases: 3, discountRate: 0.10 },
  { minCases: 5, discountRate: 0.15 },
  { minCases: 10, discountRate: 0.20 },
  { minCases: 15, discountRate: 0.25 },
];

const CATEGORY_BY_SOURCE_LABEL = {
  'SAUCES & CONDIMENTS': 'sauces-condiments',
  OILS: 'oils',
  BUTTERS: 'butters',
  'PURE CREAMS & CARPACCIO': 'pure-creams-carpaccio',
  'BRINE & WHOLE TRUFFLES': 'brine-whole-truffles',
  'SALTS & HONEY': 'salts-honey',
  'PASTA, RICE & MEALS': 'pasta-rice-meals',
  'NATURAL LINE': 'natural-line',
};

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const pushField = () => { row.push(field.trim()); field = ''; };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { field += '"'; i += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field.');
  return rows;
}

function normaliseHeader(value) {
  return value.normalize('NFKD').replace(/[€$£]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function headerIndex(headers) {
  return new Map(headers.map((header, index) => [normaliseHeader(header), index]));
}

function col(index, ...aliases) {
  for (const alias of aliases) {
    const position = index.get(normaliseHeader(alias));
    if (position !== undefined) return position;
  }
  return undefined;
}

function money(value) {
  if (!value) return undefined;
  const parsed = Number.parseFloat(String(value).replace(/[€$£\s]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function shelfMonths(value) {
  const text = String(value || '').toLowerCase();
  const years = text.match(/^(\d+)\s*years?/);
  if (years?.[1]) return Number.parseInt(years[1], 10) * 12;
  const months = text.match(/^(\d+)\s*months?/);
  if (months?.[1]) return Number.parseInt(months[1], 10);
  return undefined;
}

function truffleType(name) {
  const text = name.toLowerCase();
  const found = [];
  if (text.includes('white truffle')) found.push('white');
  if (text.includes('black truffle')) found.push('black');
  if (text.includes('summer truffle')) found.push('summer');
  if (text.includes('bianchetto')) found.push('bianchetto');
  const unique = [...new Set(found)];
  return unique.length > 1 ? 'mixed' : unique[0] || 'none';
}

function parseProducts(csv) {
  const rows = parseCsv(csv);
  const headerRow = rows.findIndex((row) => {
    const index = headerIndex(row);
    return col(index, 'Code') !== undefined && col(index, 'Product Name') !== undefined && col(index, 'Qty/Box') !== undefined && col(index, '€/unit (base)') !== undefined;
  });
  if (headerRow < 0) throw new Error('PRODUCTS: required headers not found.');
  const index = headerIndex(rows[headerRow]);
  const positions = {
    sku: col(index, 'Code'), name: col(index, 'Product Name'), shelf: col(index, 'Shelf Life'), size: col(index, 'Weight/Vol'), qty: col(index, 'Qty/Box'),
    unit: col(index, '€/unit (base)'), box: col(index, '€/box (base)'), d5: col(index, '−5%/unit'), d10: col(index, '−10%/unit'), d15: col(index, '−15%/unit'), d20: col(index, '−20%/unit'), d25: col(index, '−25%/unit (Best)'),
  };
  if (Object.values(positions).some((value) => value === undefined)) throw new Error('PRODUCTS: source schema is incomplete.');

  const products = [];
  const seen = new Set();
  let categoryId;
  for (const row of rows.slice(headerRow + 1)) {
    const first = row[0]?.trim() || '';
    if (first.startsWith('──')) {
      const label = first.replace(/─/g, '').trim().toUpperCase();
      categoryId = CATEGORY_BY_SOURCE_LABEL[label];
      if (!categoryId) throw new Error(`PRODUCTS: unknown category ${label}.`);
      continue;
    }
    if (!/^\d+$/.test(first)) continue;
    if (!categoryId) throw new Error(`PRODUCTS: SKU ${first} appears before a category.`);
    if (seen.has(first)) throw new Error(`PRODUCTS: duplicate SKU ${first}.`);
    seen.add(first);

    const name = row[positions.name]?.trim();
    const sizeLabel = row[positions.size]?.trim();
    const baseUnitPrice = money(row[positions.unit]);
    const unitsPerCase = Number.parseInt(row[positions.qty], 10);
    if (!name || !sizeLabel || !baseUnitPrice || !Number.isInteger(unitsPerCase) || unitsPerCase < 1) throw new Error(`PRODUCTS: invalid commercial data for SKU ${first}.`);

    const sourceChecks = [
      ['base case', money(row[positions.box]), roundMoney(baseUnitPrice * unitsPerCase)],
      ['−5%', money(row[positions.d5]), roundMoney(baseUnitPrice * 0.95)],
      ['−10%', money(row[positions.d10]), roundMoney(baseUnitPrice * 0.90)],
      ['−15%', money(row[positions.d15]), roundMoney(baseUnitPrice * 0.85)],
      ['−20%', money(row[positions.d20]), roundMoney(baseUnitPrice * 0.80)],
      ['−25%', money(row[positions.d25]), roundMoney(baseUnitPrice * 0.75)],
    ];
    for (const [field, actual, expected] of sourceChecks) {
      if (actual !== expected) throw new Error(`PRODUCTS: SKU ${first} ${field} mismatch: source ${actual}, expected ${expected}.`);
    }

    const months = shelfMonths(row[positions.shelf]);
    products.push({
      sku: first,
      categoryId,
      groupId: categoryId,
      name,
      sizeLabel,
      baseUnitPrice,
      unitsPerCase,
      currency: 'EUR',
      truffleType: truffleType(name),
      line: categoryId === 'natural-line' || /natural line/i.test(name) ? 'natural' : 'standard',
      ...(months ? { shelfLifeMonths: months } : {}),
      active: true,
    });
  }
  if (!products.length) throw new Error('PRODUCTS: no products parsed.');
  return products;
}

function parseTranslations(csv, productCount, categoryCount) {
  const rows = parseCsv(csv);
  const headerRow = rows.findIndex((row) => row[0]?.trim().toUpperCase() === 'KEY');
  if (headerRow < 0) throw new Error('TRANSLATIONS: KEY header not found.');
  const output = { en: {}, it: {}, fr: {}, nl: {} };
  const seen = new Set();
  for (const row of rows.slice(headerRow + 1)) {
    const key = row[0]?.trim();
    if (!key || key.startsWith('────') || !key.includes('.')) continue;
    if (seen.has(key)) throw new Error(`TRANSLATIONS: duplicate key ${key}.`);
    seen.add(key);
    const values = { en: row[1]?.trim(), it: row[2]?.trim(), fr: row[3]?.trim(), nl: row[4]?.trim() };
    for (const [lang, value] of Object.entries(values)) {
      if (!value) throw new Error(`TRANSLATIONS: ${key} missing ${lang}.`);
      output[lang][key] = value;
    }
  }
  output.en['cover.sub1'] = `${productCount} Products · ${categoryCount} Categories`;
  output.it['cover.sub1'] = `${productCount} Prodotti · ${categoryCount} Categorie`;
  output.fr['cover.sub1'] = `${productCount} Produits · ${categoryCount} Catégories`;
  output.nl['cover.sub1'] = `${productCount} Producten · ${categoryCount} Categorieën`;
  return output;
}

async function getText(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`);
  return response.text();
}

const [productCsv, translationCsv] = await Promise.all([
  getText(PRODUCTS_URL, 'PRODUCTS'),
  getText(TRANSLATIONS_URL, 'TRANSLATIONS'),
]);
const products = parseProducts(productCsv);
const categoryCount = new Set(products.map((product) => product.categoryId)).size;
const translations = parseTranslations(translationCsv, products.length, categoryCount);
const now = new Date().toISOString();
const catalogue = {
  schemaVersion: 1,
  catalogueVersion: now.replace(/[-:TZ.]/g, '').slice(0, 14),
  currency: 'EUR',
  updatedAt: now,
  verifiedAt: now,
  source: 'snapshot',
  freshness: 'fallback',
  products,
  discountPolicy: DISCOUNT_POLICY,
  sourceMeta: { spreadsheetId: SPREADSHEET_ID, sheet: 'PRODUCTS', sourceRowCount: products.length, categoryCount },
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(new URL('catalog.snapshot.json', OUTPUT_DIR), JSON.stringify(catalogue), 'utf8'),
  writeFile(new URL('translations.snapshot.json', OUTPUT_DIR), JSON.stringify(translations), 'utf8'),
]);
console.log(`Verified catalogue snapshot: ${products.length} SKUs · ${categoryCount} categories · ${Object.keys(translations.en).length} translation keys.`);
