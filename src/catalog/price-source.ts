import { createHeaderIndex, findColumn, parseCsv, parsePositiveMoney, readCell } from './csv';

export interface SourcePriceRow {
  sku: string;
  baseUnitPrice: number;
  sourceBestUnitPrice?: number;
}

const SKU_ALIASES = ['Code', 'SKU', 'Product Code'] as const;
const UNIT_PRICE_ALIASES = [
  'Unit Price',
  'Price / Unit',
  'Price per Unit',
  '€/unit',
  'Standard Price',
  'Base Unit Price',
] as const;
const BEST_PRICE_ALIASES = [
  'Best',
  'Best Price',
  'Best / Unit',
  'Best Unit Price',
  'MOQ 15 Price',
] as const;

function looksLikeHeader(row: readonly string[]): boolean {
  const index = createHeaderIndex(row);
  return findColumn(index, SKU_ALIASES) !== undefined && findColumn(index, UNIT_PRICE_ALIASES) !== undefined;
}

export function parsePriceSourceCsv(csv: string): SourcePriceRow[] {
  const rows = parseCsv(csv);
  const headerRowIndex = rows.findIndex(looksLikeHeader);

  if (headerRowIndex < 0) {
    throw new Error('Price source is missing required SKU and unit-price headers.');
  }

  const headers = rows[headerRowIndex];
  if (!headers) throw new Error('Price source header row is unavailable.');

  const headerIndex = createHeaderIndex(headers);
  const result: SourcePriceRow[] = [];
  const seenSkus = new Set<string>();

  for (const row of rows.slice(headerRowIndex + 1)) {
    const sku = readCell(row, headerIndex, SKU_ALIASES)?.replace(/[€\s]/g, '');
    if (!sku) continue;

    const baseUnitPrice = parsePositiveMoney(readCell(row, headerIndex, UNIT_PRICE_ALIASES));
    if (baseUnitPrice === undefined) {
      throw new Error(`Price source row for SKU ${sku} has an invalid unit price.`);
    }

    if (seenSkus.has(sku)) {
      throw new Error(`Price source contains duplicate SKU ${sku}.`);
    }
    seenSkus.add(sku);

    const sourceBestUnitPrice = parsePositiveMoney(readCell(row, headerIndex, BEST_PRICE_ALIASES));

    result.push({
      sku,
      baseUnitPrice,
      ...(sourceBestUnitPrice !== undefined ? { sourceBestUnitPrice } : {}),
    });
  }

  if (result.length === 0) {
    throw new Error('Price source contains no valid products.');
  }

  return result;
}
