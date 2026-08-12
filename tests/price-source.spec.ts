import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/catalog/csv';
import { parsePriceSourceCsv } from '../src/catalog/price-source';

describe('CSV parser', () => {
  it('supports quoted commas and escaped quotes', () => {
    const rows = parseCsv('Code,Product,Unit Price\n1,"Sauce, Truffle",6.36\n2,"A ""quoted"" item",5.00');

    expect(rows[1]).toEqual(['1', 'Sauce, Truffle', '6.36']);
    expect(rows[2]).toEqual(['2', 'A "quoted" item', '5.00']);
  });
});

describe('price source adapter', () => {
  it('maps by header names instead of numeric column positions', () => {
    const source = [
      'Some preliminary line',
      'Product,Best Price,SKU,Random,Price / Unit',
      'Black Truffle Sauce,"€4,77",1,ignored,"€6,36"',
      'White Truffle Oil,"€7,77",59,ignored,"€10,36"',
    ].join('\n');

    expect(parsePriceSourceCsv(source)).toEqual([
      { sku: '1', baseUnitPrice: 6.36, sourceBestUnitPrice: 4.77 },
      { sku: '59', baseUnitPrice: 10.36, sourceBestUnitPrice: 7.77 },
    ]);
  });

  it('rejects duplicate SKUs', () => {
    const source = 'Code,Unit Price\n1,6.36\n1,6.50';
    expect(() => parsePriceSourceCsv(source)).toThrow(/duplicate SKU/i);
  });

  it('rejects a source without recognised headers', () => {
    const source = 'A,B,C\n1,2,3';
    expect(() => parsePriceSourceCsv(source)).toThrow(/missing required/i);
  });
});
