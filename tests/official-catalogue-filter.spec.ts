import { describe, expect, it } from 'vitest';
import snapshot from '../public/data/catalog.snapshot.json';
import { buildStrictOfficialCatalogue } from '../src/official-catalogue-filter';
import type { Product } from '../src/catalog/types';

const sourceProducts = snapshot.products as unknown as Product[];

describe('official Excel catalogue filter', () => {
  const audit = buildStrictOfficialCatalogue(sourceProducts);

  it('produces exactly the 51 official Excel variants and nothing else', () => {
    expect(audit.products).toHaveLength(51);
    expect(new Set(audit.products.map((product) => product.officialKey)).size).toBe(51);
    expect(audit.products.every((product) => Boolean(product.officialIngredients))).toBe(true);
  });

  it('keeps incomplete official variants visible as standby instead of dropping them', () => {
    const standby = audit.products.filter((product) => product.orderStatus === 'standby');
    const orderable = audit.products.filter((product) => product.orderStatus === 'orderable');

    expect(orderable).toHaveLength(44);
    expect(standby).toHaveLength(7);
    expect(audit.missingPriceVariants).toHaveLength(4);
    expect(audit.missingPackVariants).toHaveLength(4);

    expect(standby.map((product) => product.name).sort()).toEqual([
      'Acacia Honey With Truffle',
      'Black Truffle Extra Virgin Olive Oil',
      'Salt With Summer Truffle',
      'Salt With Summer Truffle',
      'Truffle Almonds',
      'Truffle Cashew',
      'Truffle Walnuts',
    ].sort());
  });

  it('never leaks old Price List-only products into the official catalogue', () => {
    const names = audit.products.map((product) => product.name.toLowerCase());
    expect(names.some((name) => name.includes('tarallini'))).toBe(false);
    expect(names.some((name) => name.includes('pure white truffle cream'))).toBe(false);
    expect(audit.products.some((product) => product.name === 'White Truffle Sauce' && product.sizeLabel === '80g')).toBe(false);
    expect(audit.products.some((product) => product.name === 'Acacia Honey With Truffle' && product.sizeLabel === '650g')).toBe(false);
  });

  it('preserves an exact old price only when the Excel product variant exists', () => {
    const sauce500 = audit.products.find((product) => product.officialKey === 'black truffle sauce 5%|500g');
    expect(sauce500?.baseUnitPrice).toBe(16.17);
    expect(sauce500?.unitsPerCase).toBe(6);
    expect(sauce500?.orderStatus).toBe('orderable');

    const honey450 = audit.products.find((product) => product.officialKey === 'acacia honey with truffle|450g');
    expect(honey450?.baseUnitPrice).toBe(0);
    expect(honey450?.unitsPerCase).toBe(0);
    expect(honey450?.standbyReasons?.sort()).toEqual(['case-pack', 'price']);
  });
});
