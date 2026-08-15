import { describe, expect, it } from 'vitest';
import { buildStrictOfficialCatalogue } from '../src/official-catalogue-filter';
import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';
import { officialVariantKey } from '../src/official-product-remaster';
import type { Product } from '../src/catalog/types';

const PRICE_PENDING_KEYS = new Set([
  'acacia honey with truffle|650g',
  'truffle tarallini|200g',
]);

const sourceProducts: Product[] = OFFICIAL_PRODUCT_VARIANTS.flatMap((entry, index) => {
  const key = officialVariantKey(entry);
  if (PRICE_PENDING_KEYS.has(key)) return [];
  return [{
    sku: `PRICE-${String(index + 1).padStart(3, '0')}`,
    categoryId: 'sauces-condiments',
    groupId: 'sauces-condiments',
    name: entry.product,
    sizeLabel: entry.size,
    baseUnitPrice: key === 'truffled sauce summer truffle 5%|500g' ? 16.17 : 10,
    unitsPerCase: 99,
    currency: 'EUR' as const,
    active: true,
  }];
});

describe('strict official master catalogue filter', () => {
  const audit = buildStrictOfficialCatalogue(sourceProducts);

  it('produces exactly the 55 master variants and nothing else', () => {
    expect(audit.products).toHaveLength(55);
    expect(new Set(audit.products.map((product) => product.officialKey)).size).toBe(55);
    expect(new Set(audit.products.map((product) => product.sku)).size).toBe(55);
    expect(audit.products.every((product) => Boolean(product.officialIngredients))).toBe(true);
    expect(audit.products.every((product) => product.syntheticCatalogueCode === false)).toBe(true);
  });

  it('puts only price-missing master rows in standby because every pack is resolved', () => {
    const standby = audit.products.filter((product) => product.orderStatus === 'standby');
    const orderable = audit.products.filter((product) => product.orderStatus === 'orderable');

    expect(standby.map((product) => `${product.name}|${product.sizeLabel}|${product.standbyReasons?.join('+')}`).sort()).toEqual([
      'Acacia Honey with Truffle|650g|price',
      'Truffle Tarallini|200g|price',
    ].sort());
    expect(orderable).toHaveLength(53);
    expect(standby).toHaveLength(2);
    expect(audit.missingPriceVariants).toHaveLength(2);
    expect(audit.missingPackVariants).toEqual([]);
    expect(audit.excludedForMissingPack).toEqual([]);
  });

  it('uses master SKU and case pack instead of donor identifiers', () => {
    const sauce500 = audit.products.find((product) => product.officialKey === 'truffled sauce summer truffle 5%|500g');
    expect(sauce500?.baseUnitPrice).toBe(16.17);
    expect(sauce500?.unitsPerCase).toBe(6);
    expect(sauce500?.sku).toBe('5430004174127');
    expect(sauce500?.officialSku).toBe('5430004174127');
    expect(sauce500?.orderStatus).toBe('orderable');
  });

  it('includes corrected/new master rows while rejecting sizes that are not in the master', () => {
    expect(audit.products.some((product) => product.name === 'Tartufata White Sauce (with Bianchetto 2%)' && product.sizeLabel === '80g')).toBe(true);
    expect(audit.products.some((product) => product.name === 'Acacia Honey with Truffle' && product.sizeLabel === '650g')).toBe(true);
    expect(audit.products.some((product) => product.name === 'Truffle Tarallini' && product.sizeLabel === '200g')).toBe(true);
    expect(audit.products.some((product) => product.name === 'White Truffle Extra Virgin Olive Oil' && product.sizeLabel === '500ml')).toBe(false);
    expect(audit.products.some((product) => product.name === 'Acacia Honey with Truffle' && product.sizeLabel === '450g')).toBe(false);
  });
});
