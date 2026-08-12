import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vReWkxNwkrVotMwHMpcQRENgkt1cZRmdixrwW10TAHP6Y1In6BZHEbkQu9sI-vikg/pub';
const PRODUCTS_URL = `${BASE}?gid=86187412&single=true&output=csv`;
const TRANSLATIONS_URL = `${BASE}?gid=29668113&single=true&output=csv`;
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

const CATEGORIES = {
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
    if (row.some(Boolean)) rows.push(row);
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
  if (field || row.length) pushRow();
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field.');
  return rows;
}

const normalise = (value) => String(value)
  .normalize('NFKD')
  .replace(/[€$£]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

function indexHeaders(headers) {
  const index = new Map();
  headers.forEach((header, position) => {
    const key = normalise(header);
    if (key && !index.has(key)) index.set(key, position);
  });
  return index;
}

function column(index, ...aliases) {
  for (const alias of aliases) {
    const position = index.get(normalise(alias));
    if (position !== undefined) return position;
  }
  return undefined;
}

function money(value) {
  if (!value) return undefined;
  const cleaned = String(value).replace(/[€$£\s'’]/g, '').replace(/[^0-9.,+-]/g, '');
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot
      ? cleaned.replaceAll('.', '').replace(',', '.')
      : cleaned.replaceAll(',', '');
  } else if (comma >= 0) {
    normalized = cleaned.length - comma - 1 === 2 ? cleaned.replace(',', '.') : cleaned.replaceAll(',', '');
  } else if (dot >= 0 && cleaned.length - dot - 1 !== 2) {
    normalized = cleaned.replaceAll('.', '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function roundMoney(value) {
  return Math.round((value + 1e-9) * 100) / 100;
}

function shelfMonths(value) {
  const text = String(value || '').toLowerCase().trim();
  const years = text.match(/^(\d+)\s*years?/);
  if (years?.[1]) return Number.parseInt(years[1], 10) * 12;
  const months = text.match(/^(\d+)\s*months?/);
  return months?.[1] ? Number.parseInt(months[1], 10) : undefined;
}

function truffleType(name) {
  const text = name.toLowerCase();
  const types = [];
  if (text.includes('white truffle')) types.push('white');
  if (text.includes('black truffle')) types.push('black');
  if (text.includes('summer truffle')) types.push('summer');
  if (text.includes('bianchetto')) types.push('bianchetto');
  const unique = [...new Set(types)];
  return unique.length > 1 ? 'mixed' : unique[0] || 'none';
}

function requireColumns(index) {
  const positions = {
    name: column(index, 'Product Name'),
    shelf: column(index, 'Shelf Life'),
    size: column(index, 'Weight/Vol'),
    qty: column(index, 'Qty/Box'),
    unit: column(index, '€/unit (base)'),
    box: column(index, '€/box (base)'),
    d5: column(index, '−5%/unit'),
    d10: column(index, '−10%/unit'),
    d15: column(index, '−15%/unit'),
    d20: column(index, '−20%/unit'),
    d25: column(index, '−25%/unit (Best)'),
  };
  for (const [field, position] of Object.entries(positions)) {
    if (position === undefined) throw new Error(`PRODUCTS: required column ${field} is missing.`);
  }
  return positions;
}

function parseProducts(csv) {
  const rows = parseCsv(csv);
  const headerRow = rows.findIndex((row) => {
    const index = indexHeaders(row);
    return column(index, 'Code') !== undefined && column(index, 'Product Name') !== undefined && column(index, 'Qty/Box') !== undefined && column(index, '€/unit (base)') !== undefined;
  });
  if (headerRow < 0) throw new Error('PRODUCTS: required header row not found.');

  const positions = requireColumns(indexHeaders(rows[headerRow]));
  const products = [];
  const seen = new Set();
  let categoryId;

  for (const row of rows.slice(headerRow + 1)) {
    const first = row[0]?.trim() || '';
    if (first.startsWith('──')) {
      const label = first.replace(/─/g, '').trim().toUpperCase();
      categoryId = CATEGORIES[label];
      if (!categoryId) throw new Error(`PRODUCTS: unknown category section ${label}.`);
      continue;
    }
    if (!/^\d+$/.test(first)) continue;
    if (!categoryId) throw new Error(`PRODUCTS: SKU ${first} appears before a category section.`);
    if (seen.has(first)) throw new Error(`PRODUCTS: duplicate SKU ${first}.`);
    seen.add(first);

    const name = row[positions.name]?.trim();
    const sizeLabel = row[positions.size]?.trim();
    const baseUnitPrice = money(row[positions.unit]);
    const unitsPerCase = Number.parseInt(row[positions.qty], 10);
    if (!name || !sizeLabel || !baseUnitPrice || !Number.isInteger(unitsPerCase) || unitsPerCase < 1) {
      throw new Error(`PRODUCTS: invalid required commercial data for SKU ${first}.`);
    }

    const checks = [
      ['base case', money(row[positions.box]), roundMoney(baseUnitPrice * unitsPerCase)],
      ['−5%', money(row[positions.d5]), roundMoney(baseUnitPrice * 0.95)],
      ['−10%', money(row[positions.d10]), roundMoney(baseUnitPrice * 0.90)],
      ['−15%', money(row[positions.d15]), roundMoney(baseUnitPrice * 0.85)],
      ['−20%', money(row[positions.d20]), roundMoney(baseUnitPrice * 0.80)],
      ['−25%', money(row[positions.d25]), roundMoney(baseUnitPrice * 0.75)],
    ];
    for (const [field, actual, expected] of checks) {
      if (actual !== expected) {
        throw new Error(`PRODUCTS: SKU ${first} ${field} mismatch: source ${actual}, expected ${expected}.`);
      }
    }

    const shelfLifeMonths = shelfMonths(row[positions.shelf]);
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
      ...(shelfLifeMonths ? { shelfLifeMonths } : {}),
      active: true,
    });
  }

  if (!products.length) throw new Error('PRODUCTS: no product rows parsed.');
  return products;
}

function parseTranslations(csv, productCount, categoryCount) {
  const rows = parseCsv(csv);
  const headerRow = rows.findIndex((row) => row[0]?.trim().toUpperCase() === 'KEY');
  if (headerRow < 0) throw new Error('TRANSLATIONS: KEY header not found.');

  const bundle = { en: {}, it: {}, fr: {}, nl: {} };
  const seen = new Set();
  const degraded = [];

  for (const row of rows.slice(headerRow + 1)) {
    const key = row[0]?.trim();
    if (!key || key.startsWith('────') || !key.includes('.')) continue;
    if (seen.has(key)) throw new Error(`TRANSLATIONS: duplicate key ${key}.`);
    seen.add(key);

    const english = row[1]?.trim() || key;
    const values = {
      en: english,
      it: row[2]?.trim() || english,
      fr: row[3]?.trim() || english,
      nl: row[4]?.trim() || english,
    };

    for (const [language, value] of Object.entries(values)) {
      bundle[language][key] = value;
      if (!row[{ en: 1, it: 2, fr: 3, nl: 4 }[language]]?.trim()) degraded.push(`${key}:${language}`);
    }
  }

  bundle.en['cover.sub1'] = `${productCount} Products · ${categoryCount} Categories`;
  bundle.it['cover.sub1'] = `${productCount} Prodotti · ${categoryCount} Categorie`;
  bundle.fr['cover.sub1'] = `${productCount} Produits · ${categoryCount} Catégories`;
  bundle.nl['cover.sub1'] = `${productCount} Producten · ${categoryCount} Categorieën`;

  if (degraded.length) {
    console.warn(`TRANSLATIONS: published CSV has ${degraded.length} missing cell(s); safe fallback applied. First: ${degraded.slice(0, 8).join(', ')}.`);
  }

  return { bundle, degradedCount: degraded.length };
}

async function fetchCsv(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`);
  return response.text();
}

const [productCsv, translationCsv] = await Promise.all([
  fetchCsv(PRODUCTS_URL, 'PRODUCTS'),
  fetchCsv(TRANSLATIONS_URL, 'TRANSLATIONS'),
]);

const products = parseProducts(productCsv);
const categoryCount = new Set(products.map((product) => product.categoryId)).size;
const { bundle: translations, degradedCount } = parseTranslations(translationCsv, products.length, categoryCount);
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
  sourceMeta: {
    spreadsheetId: SPREADSHEET_ID,
    sheet: 'PRODUCTS',
    sourceRowCount: products.length,
    categoryCount,
  },
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(new URL('catalog.snapshot.json', OUTPUT_DIR), JSON.stringify(catalogue), 'utf8'),
  writeFile(new URL('translations.snapshot.json', OUTPUT_DIR), JSON.stringify(translations), 'utf8'),
]);

console.log(`Verified catalogue snapshot: ${products.length} SKUs · ${categoryCount} categories · ${Object.keys(translations.en).length} translation keys · ${degradedCount} published translation fallback(s).`);
