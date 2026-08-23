import { findRemasteredOfficialVariant } from '../../../../src/official-product-remaster';
import type { SheetCommercialProduct } from '../types';

const SPREADSHEET_ID = '1qqOv6i2UrZZwtbW8awMzawBNs8f9UblGoL25QZf3u94';
const PRODUCTS_GID = '86187412';
const PRODUCTS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${PRODUCTS_GID}`;
const FOOD_VAT_RATE = 6;

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field.trim());
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some(Boolean)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      pushRow();
    } else {
      field += char;
    }
  }
  if (field || row.length) pushRow();
  if (quoted) throw new Error('Price List Sheet CSV contains an unterminated quoted field.');
  return rows;
}

function normaliseHeader(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[€$£]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function headerIndex(row: readonly string[]): Map<string, number> {
  const result = new Map<string, number>();
  row.forEach((value, index) => {
    const key = normaliseHeader(value);
    if (key && !result.has(key)) result.set(key, index);
  });
  return result;
}

function column(index: ReadonlyMap<string, number>, ...aliases: string[]): number | undefined {
  for (const alias of aliases) {
    const found = index.get(normaliseHeader(alias));
    if (found !== undefined) return found;
  }
  return undefined;
}

function positiveMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[€$£\s'’]/g, '').replace(/[^0-9.,+-]/g, '');
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? cleaned.replaceAll('.', '').replace(',', '.') : cleaned.replaceAll(',', '');
  } else if (comma >= 0) {
    normalized = cleaned.length - comma - 1 === 2 ? cleaned.replace(',', '.') : cleaned.replaceAll(',', '');
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseSheetCommercialProducts(csv: string): SheetCommercialProduct[] {
  const rows = parseCsv(csv);
  const headerRow = rows.findIndex((row) => {
    const index = headerIndex(row);
    return column(index, 'Code') !== undefined
      && column(index, 'Product Name') !== undefined
      && column(index, 'Weight/Vol') !== undefined
      && column(index, 'Qty/Box') !== undefined
      && column(index, '€/unit (base)') !== undefined;
  });
  if (headerRow < 0) throw new Error('Price List Sheet is missing the required PRODUCTS header.');

  const headers = rows[headerRow];
  if (!headers) throw new Error('Price List Sheet header row is unavailable.');
  const index = headerIndex(headers);
  const codeColumn = column(index, 'Code');
  const nameColumn = column(index, 'Product Name');
  const sizeColumn = column(index, 'Weight/Vol');
  const packColumn = column(index, 'Qty/Box');
  const priceColumn = column(index, '€/unit (base)');
  if ([codeColumn, nameColumn, sizeColumn, packColumn, priceColumn].some((value) => value === undefined)) {
    throw new Error('Price List Sheet PRODUCTS columns are incomplete.');
  }

  const byOfficialSku = new Map<string, SheetCommercialProduct>();
  for (const row of rows.slice(headerRow + 1)) {
    const sourceCode = row[codeColumn!]?.trim();
    if (!sourceCode || !/^\d+$/.test(sourceCode)) continue;
    const sourceName = row[nameColumn!]?.trim();
    const sourceSize = row[sizeColumn!]?.trim();
    if (!sourceName || !sourceSize) continue;

    const official = findRemasteredOfficialVariant(sourceName, sourceSize);
    if (!official) continue;

    const amountExcl = positiveMoney(row[priceColumn!]);
    const sheetUnitsPerCase = positiveInteger(row[packColumn!]);
    if (amountExcl === undefined || sheetUnitsPerCase === undefined) {
      throw new Error(`Price List Sheet row ${sourceCode} has invalid commercial price or Qty/Box.`);
    }

    const product: SheetCommercialProduct = {
      sourceCode,
      sku: official.sku,
      name: official.product,
      amountExcl,
      vatRate: FOOD_VAT_RATE,
      unit: 'NAR',
      sizeLabel: official.size,
      unitsPerCase: official.unitsPerCase,
      sheetUnitsPerCase,
      officialKey: official.officialKey,
    };

    const existing = byOfficialSku.get(product.sku);
    if (existing) {
      const sameCommercialData = existing.amountExcl === product.amountExcl
        && existing.sheetUnitsPerCase === product.sheetUnitsPerCase;
      if (!sameCommercialData) {
        console.warn('[HOT Price List] duplicate commercial row ignored', {
          sku: product.sku,
          keptSourceCode: existing.sourceCode,
          ignoredSourceCode: product.sourceCode,
        });
      }
      continue;
    }
    byOfficialSku.set(product.sku, product);
  }

  const products = [...byOfficialSku.values()];
  if (products.length === 0) throw new Error('Price List Sheet contains no rows matching the official product master.');
  return products;
}

export async function listSheetCommercialProducts(): Promise<SheetCommercialProduct[]> {
  const response = await fetch(PRODUCTS_CSV_URL, {
    headers: { Accept: 'text/csv' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Price List Sheet returned HTTP ${response.status}.`);
  return parseSheetCommercialProducts(await response.text());
}
