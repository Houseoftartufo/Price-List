import { describe, expect, it } from 'vitest';
import { buildStrictOfficialCatalogue } from '../src/official-catalogue-filter';
import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';
import { officialVariantKey } from '../src/official-product-remaster';
import type { Product } from '../src/catalog/types';

const PRICE_PENDING_KEYS = new Set([
  'truffle cashew|80g',
  'truffle almonds|80g',
  'truffle walnuts|80g',
  'acacia honey with truffle|450g',
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
    baseUnitPrice: key === 'black truffle sauce 5%|500g' ? 16.17 : 10,
    unitsPerCase: 99,
    currency: 'EUR' as const,
    active: true,
  }];
});

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

    expect(standby.map((product) => `${product.name}|${product.sizeLabel}|${product.standbyReasons?.join('+')}`).sort()).toEqual([
      'Acacia Honey With Truffle|450g|price+case-pack',
      'Black Truffle Extra Virgin Olive Oil|60ml|case-pack',
      'Salt With Summer Truffle|120g|case-pack',
      'Salt With Summer Truffle|30g|case-pack',
      'Truffle Almonds|80g|price',
      'Truffle Cashew|80g|price',
      'Truffle Walnuts|80g|price',
    ].sort());
    expect(orderable).toHaveLength(44);
    expect(standby).toHaveLength(7);
    expect(audit.missingPriceVariants).toHaveLength(4);
    expect(audit.missingPackVariants).toHaveLength(4);
  });

  it('never admits variants that are not in the Excel master', () => {
    expect(audit.products.some((product) => product.name === 'White Truffle Sauce' && product.sizeLabel === '80g')).toBe(false);
    expect(audit.products.some((product) => product.name === 'Acacia Honey With Truffle' && product.sizeLabel === '650g')).toBe(false);
    expect(audit.products.some((product) => /tarallini/i.test(product.name))).toBe(false);
  });

  it('overrides donor case-pack values with the official Excel cross-check', () => {
    const sauce500 = audit.products.find((product) => product.officialKey === 'black truffle sauce 5%|500g');
    expect(sauce500?.baseUnitPrice).toBe(16.17);
    expect(sauce500?.unitsPerCase).toBe(6);
    expect(sauce500?.orderStatus).toBe('orderable');

    const aceto = audit.products.find((product) => product.officialKey === 'aceto balsamico di modena|100ml');
    expect(aceto?.unitsPerCase).toBe(12);
    expect(aceto?.orderStatus).toBe('orderable');

    const honey450 = audit.products.find((product) => product.officialKey === 'acacia honey with truffle|450g');
    expect(honey450?.baseUnitPrice).toBe(0);
    expect(honey450?.unitsPerCase).toBe(0);
    expect(honey450?.standbyReasons?.sort()).toEqual(['case-pack', 'price']);
  });
});
