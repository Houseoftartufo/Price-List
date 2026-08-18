import { describe, expect, it } from 'vitest';

import { normalizeSearchText, searchOfficialProducts } from '../src/universal-product-search';

function products(query: string): string[] {
  return [...new Set(searchOfficialProducts(query).map((hit) => hit.product))];
}

describe('universal product search', () => {
  it('normalizes accents, punctuation and common units', () => {
    expect(normalizeSearchText('  CRÈME — 500 gr ')).toBe('creme 500g');
    expect(normalizeSearchText('1 litre')).toBe('1l');
  });

  it.each([
    ['salsa', 'Truffled Sauce – Summer Truffle 5%'],
    ['huile truffe blanche', 'White Truffle Extra Virgin Olive Oil'],
    ['olio tartufo bianco', 'White Truffle Extra Virgin Olive Oil'],
    ['witte truffel olie', 'White Truffle Extra Virgin Olive Oil'],
    ['weißer trüffel öl', 'White Truffle Extra Virgin Olive Oil'],
    ['aceite trufa blanca', 'White Truffle Extra Virgin Olive Oil'],
    ['azeite trufa branca', 'White Truffle Extra Virgin Olive Oil'],
    ['olej biala trufla', 'White Truffle Extra Virgin Olive Oil'],
  ])('understands %s', (query, expectedProduct) => {
    expect(products(query)).toContain(expectedProduct);
  });

  it('tolerates useful product typos', () => {
    expect(products('carpacio')).toContain('Summer Truffle Carpaccio');
    expect(products('mayonese')).toContain('Black Truffle Mayonnaise');
  });

  it('searches technical product content such as ingredients', () => {
    expect(products('porcini')).toContain('Porcini Mushroom Cream with Summer Truffle');
  });

  it('combines translated concepts with formats', () => {
    const hits = searchOfficialProducts('salsa 500g');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.product.toLowerCase().includes('sauce'))).toBe(true);
  });

  it('ranks exact SKU above semantic matches', () => {
    const hits = searchOfficialProducts('5430004174424');
    expect(hits[0]?.sku).toBe('5430004174424');
    expect(hits[0]?.score).toBe(10000);
  });
});
