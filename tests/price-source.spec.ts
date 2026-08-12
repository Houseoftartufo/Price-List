import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/catalog/csv';
import {
  parseCatalogueSourceCsv,
  parsePriceSourceCsv,
  reconcileSourceProduct,
  sourceRowToProduct,
} from '../src/catalog/price-source';

describe('CSV parser', () => {
  it('supports quoted commas and escaped quotes', () => {
    const rows = parseCsv('Code,Product,Unit Price\n1,"Sauce, Truffle",6.36\n2,"A ""quoted"" item",5.00');
    expect(rows[1]).toEqual(['1', 'Sauce, Truffle', '6.36']);
    expect(rows[2]).toEqual(['2', 'A "quoted" item', '5.00']);
  });
});

describe('catalogue source adapter', () => {
  const source = [
    'HOUSE OF TARTUFO — PRODUCT PRICE LIST 2026',
    'Base prices',
    'Code,Product Name,Shelf Life,Weight/Vol,Qty/Box,€/unit (base),€/box (base),−5%/unit,−10%/unit,−15%/unit,−20%/unit,−25%/unit (Best)',
    '── OILS',
    '59,White Truffle Extra Virgin Olive Oil,2 years,250ml,12,€10.36,€124.32,€9.84,€9.32,€8.81,€8.29,€7.77',
    '60,White Truffle Extra Virgin Olive Oil,2 years,500ml,6,€17.83,€106.98,€16.94,€16.05,€15.16,€14.26,€13.37',
    '── NATURAL LINE',
    '143,Tartufata Sauce – Summer Truffle 5% – Natural Line,3 years,170g,12,€10.91,€130.92,€10.36,€9.82,€9.27,€8.73,€8.18',
  ].join('\n');

  it('parses the exact live schema and section-based categories', () => {
    const rows = parseCatalogueSourceCsv(source);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      sku: '59',
      categoryId: 'oils',
      unitsPerCase: 12,
      baseUnitPrice: 10.36,
      sourceBaseCasePrice: 124.32,
    });
    expect(rows[2]?.categoryId).toBe('natural-line');
  });

  it('converts live rows into canonical products', () => {
    const product = sourceRowToProduct(parseCatalogueSourceCsv(source)[2]!);
    expect(product).toMatchObject({
      sku: '143',
      categoryId: 'natural-line',
      groupId: 'natural-line',
      line: 'natural',
      truffleType: 'summer',
      shelfLifeMonths: 36,
    });
  });

  it('validates source check columns against deterministic formulas', () => {
    for (const row of parseCatalogueSourceCsv(source)) {
      expect(reconcileSourceProduct(row)).toEqual([]);
    }
  });

  it('keeps the lightweight price adapter compatible', () => {
    expect(parsePriceSourceCsv(source)[0]).toEqual({
      sku: '59',
      baseUnitPrice: 10.36,
      sourceBestUnitPrice: 7.77,
    });
  });

  it('rejects duplicate SKUs', () => {
    const duplicated = `${source}\n59,Duplicate,2 years,250ml,12,€10.36,€124.32,€9.84,€9.32,€8.81,€8.29,€7.77`;
    expect(() => parseCatalogueSourceCsv(duplicated)).toThrow(/duplicate SKU/i);
  });

  it('rejects a source without recognised headers', () => {
    expect(() => parseCatalogueSourceCsv('A,B,C\n1,2,3')).toThrow(/missing required/i);
  });
});
