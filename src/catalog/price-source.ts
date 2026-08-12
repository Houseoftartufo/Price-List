import {
  createHeaderIndex,
  findColumn,
  parseCsv,
  parsePositiveInteger,
  parsePositiveMoney,
  readCell,
} from './csv';
import { roundMoney } from './pricing';
import type { Product, ProductLine, TruffleType } from './types';

export interface SourcePriceRow {
  sku: string;
  baseUnitPrice: number;
  sourceBestUnitPrice?: number;
}

export interface SourceProductRow {
  sku: string;
  categoryId: string;
  name: string;
  shelfLifeLabel: string;
  sizeLabel: string;
  unitsPerCase: number;
  baseUnitPrice: number;
  sourceBaseCasePrice?: number;
  sourceTierUnitPrices: Partial<Record<2 | 3 | 5 | 10 | 15, number>>;
}

export interface SourceReconciliationIssue {
  sku: string;
  field: string;
  sourceValue: number;
  derivedValue: number;
}

const SKU_ALIASES = ['Code', 'SKU', 'Product Code'] as const;
const PRODUCT_ALIASES = ['Product Name', 'Product', 'Name'] as const;
const SHELF_ALIASES = ['Shelf Life', 'Shelf life'] as const;
const SIZE_ALIASES = ['Weight/Vol', 'Size', 'Format', 'Weight'] as const;
const CASE_QTY_ALIASES = ['Qty/Box', 'Units / Box', 'Units per Case', 'Case Qty', 'Box Qty'] as const;
const UNIT_PRICE_ALIASES = [
  '€/unit (base)',
  'Unit Price',
  'Price / Unit',
  'Price per Unit',
  '€/unit',
  'Standard Price',
  'Base Unit Price',
] as const;
const CASE_PRICE_ALIASES = ['€/box (base)', 'Base Case Price', 'Base Box Price'] as const;
const TIER_2_ALIASES = ['−5%/unit', '-5%/unit'] as const;
const TIER_3_ALIASES = ['−10%/unit', '-10%/unit'] as const;
const TIER_5_ALIASES = ['−15%/unit', '-15%/unit'] as const;
const TIER_10_ALIASES = ['−20%/unit', '-20%/unit'] as const;
const TIER_15_ALIASES = [
  '−25%/unit (Best)',
  '-25%/unit (Best)',
  'Best',
  'Best Price',
  'Best / Unit',
  'Best Unit Price',
  'MOQ 15 Price',
] as const;

const CATEGORY_BY_SOURCE_LABEL: Readonly<Record<string, string>> = {
  'SAUCES & CONDIMENTS': 'sauces-condiments',
  OILS: 'oils',
  BUTTERS: 'butters',
  'PURE CREAMS & CARPACCIO': 'pure-creams-carpaccio',
  'BRINE & WHOLE TRUFFLES': 'brine-whole-truffles',
  'SALTS & HONEY': 'salts-honey',
  'PASTA, RICE & MEALS': 'pasta-rice-meals',
  'NATURAL LINE': 'natural-line',
};

function looksLikeHeader(row: readonly string[]): boolean {
  const index = createHeaderIndex(row);
  return (
    findColumn(index, SKU_ALIASES) !== undefined &&
    findColumn(index, PRODUCT_ALIASES) !== undefined &&
    findColumn(index, UNIT_PRICE_ALIASES) !== undefined &&
    findColumn(index, CASE_QTY_ALIASES) !== undefined
  );
}

function sectionLabel(value: string | undefined): string | undefined {
  if (!value?.trim().startsWith('──')) return undefined;
  return value.replace(/─/g, '').trim().toUpperCase();
}

function readRequired(
  row: readonly string[],
  index: ReadonlyMap<string, number>,
  aliases: readonly string[],
  label: string,
  sku: string,
): string {
  const value = readCell(row, index, aliases);
  if (!value) throw new Error(`Price source row for SKU ${sku} is missing ${label}.`);
  return value;
}

function parseShelfLifeMonths(value: string): number | undefined {
  const normalised = value.toLowerCase().trim();
  const years = normalised.match(/^(\d+)\s*years?/);
  if (years?.[1]) return Number.parseInt(years[1], 10) * 12;
  const months = normalised.match(/^(\d+)\s*months?/);
  if (months?.[1]) return Number.parseInt(months[1], 10);
  return undefined;
}

function inferTruffleType(name: string): TruffleType {
  const normalised = name.toLowerCase();
  const matches: TruffleType[] = [];
  if (normalised.includes('white truffle')) matches.push('white');
  if (normalised.includes('black truffle')) matches.push('black');
  if (normalised.includes('summer truffle')) matches.push('summer');
  if (normalised.includes('bianchetto')) matches.push('bianchetto');
  const unique = [...new Set(matches)];
  if (unique.length > 1) return 'mixed';
  return unique[0] ?? 'none';
}

function inferLine(row: SourceProductRow): ProductLine {
  return row.categoryId === 'natural-line' || /natural line/i.test(row.name) ? 'natural' : 'standard';
}

export function parseCatalogueSourceCsv(csv: string): SourceProductRow[] {
  const rows = parseCsv(csv);
  const headerRowIndex = rows.findIndex(looksLikeHeader);
  if (headerRowIndex < 0) {
    throw new Error('Price source is missing required catalogue headers.');
  }

  const headers = rows[headerRowIndex];
  if (!headers) throw new Error('Price source header row is unavailable.');
  const headerIndex = createHeaderIndex(headers);
  const result: SourceProductRow[] = [];
  const seenSkus = new Set<string>();
  let currentCategoryId: string | undefined;

  for (const row of rows.slice(headerRowIndex + 1)) {
    const firstCell = row[0]?.trim();
    const label = sectionLabel(firstCell);
    if (label) {
      currentCategoryId = CATEGORY_BY_SOURCE_LABEL[label];
      if (!currentCategoryId) throw new Error(`Unknown catalogue category section: ${label}.`);
      continue;
    }

    const sku = readCell(row, headerIndex, SKU_ALIASES)?.replace(/[€\s]/g, '');
    if (!sku || !/^\d+$/.test(sku)) continue;
    if (!currentCategoryId) throw new Error(`SKU ${sku} appears before a recognised category section.`);
    if (seenSkus.has(sku)) throw new Error(`Price source contains duplicate SKU ${sku}.`);
    seenSkus.add(sku);

    const baseUnitPrice = parsePositiveMoney(readCell(row, headerIndex, UNIT_PRICE_ALIASES));
    const unitsPerCase = parsePositiveInteger(readCell(row, headerIndex, CASE_QTY_ALIASES));
    if (baseUnitPrice === undefined) throw new Error(`Price source row for SKU ${sku} has an invalid unit price.`);
    if (unitsPerCase === undefined) throw new Error(`Price source row for SKU ${sku} has an invalid Qty/Box.`);

    const sourceTierUnitPrices: SourceProductRow['sourceTierUnitPrices'] = {};
    const tierValues: Array<[2 | 3 | 5 | 10 | 15, readonly string[]]> = [
      [2, TIER_2_ALIASES],
      [3, TIER_3_ALIASES],
      [5, TIER_5_ALIASES],
      [10, TIER_10_ALIASES],
      [15, TIER_15_ALIASES],
    ];
    for (const [cases, aliases] of tierValues) {
      const value = parsePositiveMoney(readCell(row, headerIndex, aliases));
      if (value !== undefined) sourceTierUnitPrices[cases] = value;
    }

    result.push({
      sku,
      categoryId: currentCategoryId,
      name: readRequired(row, headerIndex, PRODUCT_ALIASES, 'Product Name', sku),
      shelfLifeLabel: readRequired(row, headerIndex, SHELF_ALIASES, 'Shelf Life', sku),
      sizeLabel: readRequired(row, headerIndex, SIZE_ALIASES, 'Weight/Vol', sku),
      unitsPerCase,
      baseUnitPrice,
      sourceBaseCasePrice: parsePositiveMoney(readCell(row, headerIndex, CASE_PRICE_ALIASES)),
      sourceTierUnitPrices,
    });
  }

  if (result.length === 0) throw new Error('Price source contains no valid products.');
  return result;
}

export function sourceRowToProduct(row: SourceProductRow): Product {
  const shelfLifeMonths = parseShelfLifeMonths(row.shelfLifeLabel);
  return {
    sku: row.sku,
    categoryId: row.categoryId,
    groupId: row.categoryId,
    name: row.name,
    sizeLabel: row.sizeLabel,
    baseUnitPrice: row.baseUnitPrice,
    unitsPerCase: row.unitsPerCase,
    currency: 'EUR',
    truffleType: inferTruffleType(row.name),
    line: inferLine(row),
    ...(shelfLifeMonths !== undefined ? { shelfLifeMonths } : {}),
    active: true,
  };
}

export function reconcileSourceProduct(row: SourceProductRow): SourceReconciliationIssue[] {
  const issues: SourceReconciliationIssue[] = [];
  const expectedBaseCase = roundMoney(row.baseUnitPrice * row.unitsPerCase);
  if (row.sourceBaseCasePrice !== undefined && row.sourceBaseCasePrice !== expectedBaseCase) {
    issues.push({
      sku: row.sku,
      field: 'baseCasePrice',
      sourceValue: row.sourceBaseCasePrice,
      derivedValue: expectedBaseCase,
    });
  }

  const discountByCases: Readonly<Record<2 | 3 | 5 | 10 | 15, number>> = {
    2: 0.05,
    3: 0.1,
    5: 0.15,
    10: 0.2,
    15: 0.25,
  };
  for (const cases of [2, 3, 5, 10, 15] as const) {
    const sourceValue = row.sourceTierUnitPrices[cases];
    if (sourceValue === undefined) continue;
    const expected = roundMoney(row.baseUnitPrice * (1 - discountByCases[cases]));
    if (sourceValue !== expected) {
      issues.push({ sku: row.sku, field: `tier-${cases}`, sourceValue, derivedValue: expected });
    }
  }
  return issues;
}

export function parsePriceSourceCsv(csv: string): SourcePriceRow[] {
  return parseCatalogueSourceCsv(csv).map((row) => ({
    sku: row.sku,
    baseUnitPrice: row.baseUnitPrice,
    ...(row.sourceTierUnitPrices[15] !== undefined
      ? { sourceBestUnitPrice: row.sourceTierUnitPrices[15] }
      : {}),
  }));
}
