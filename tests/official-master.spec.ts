import { describe, expect, it } from 'vitest';
import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';
import {
  OFFICIAL_VARIANT_COUNT,
  findRemasteredOfficialVariant,
} from '../src/official-product-remaster';
import { OFFICIAL_SHOPIFY_MAP } from '../src/official-shopify-map';

describe('official Excel product master', () => {
  it('contains exactly the 51 official Excel variants and every row resolves to itself', () => {
    expect(OFFICIAL_VARIANT_COUNT).toBe(51);
    expect(OFFICIAL_PRODUCT_VARIANTS).toHaveLength(51);

    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      const resolved = findRemasteredOfficialVariant(entry.product, entry.size);
      expect(resolved, `${entry.product} ${entry.size}`).toBeDefined();
      expect(resolved?.ingredients).toBe(entry.ingredients);
    }
  });

  it('never admits variants that are not in the official Excel files', () => {
    expect(findRemasteredOfficialVariant('White Truffled Sauce – Bianchetto Truffle 2%', '80g')).toBeUndefined();
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '500ml')).toBeUndefined();
    expect(findRemasteredOfficialVariant('Acacia Honey with Truffle', '650g')).toBeUndefined();
    expect(findRemasteredOfficialVariant('Truffle Tarallini', '200g')).toBeUndefined();
    expect(findRemasteredOfficialVariant('Pure White Truffle Cream', '80g')).toBeUndefined();
  });

  it('uses the official unit-per-box cross-check instead of the old Price List value', () => {
    expect(findRemasteredOfficialVariant('Truffled Sauce – Summer Truffle 5%', '500g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('Truffled Sauce – Summer Truffle 10%', '500g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('White Truffled Sauce – Bianchetto Truffle 2%', '500g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '1L')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '5L')?.unitsPerCase).toBe(4);
    expect(findRemasteredOfficialVariant('Acacia Honey with Truffle', '450g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('Truffle Cashews', '80g')?.unitsPerCase).toBe(16);
    expect(findRemasteredOfficialVariant('Truffle Almonds', '80g')?.unitsPerCase).toBe(16);
    expect(findRemasteredOfficialVariant('Truffle Walnuts', '80g')?.unitsPerCase).toBe(16);
  });

  it('keeps only genuinely unresolved case packs explicitly in standby', () => {
    const pending = OFFICIAL_PRODUCT_VARIANTS
      .map((entry) => findRemasteredOfficialVariant(entry.product, entry.size))
      .filter((entry) => entry?.packStatus === 'missing')
      .map((entry) => `${entry?.product}|${entry?.size}`)
      .sort();

    expect(pending).toEqual([
      'ACETO BALSAMICO DI MODENA|100 ml',
      'BLACK TRUFFLE EXTRA-VIRGIN OLIVE OIL|60 ml',
      'SALT WITH SUMMER TRUFFLE|120 g',
      'SALT WITH SUMMER TRUFFLE|30 g',
    ].sort());
  });

  it('does not promote SKU candidates explicitly marked unsafe in the cross-check workbook', () => {
    expect(findRemasteredOfficialVariant('Black Truffle Mayonnaise', '120g')?.sku).toBeUndefined();
    expect(findRemasteredOfficialVariant('White Truffle Genovese Pesto', '80g')?.sku).toBeUndefined();
  });

  it('only exposes Shopify enrichment for official variants', () => {
    expect(Object.keys(OFFICIAL_SHOPIFY_MAP)).toHaveLength(23);
    for (const [key, mapping] of Object.entries(OFFICIAL_SHOPIFY_MAP)) {
      expect(mapping.handle).toBeTruthy();
      expect(mapping.siteSku).toBeTruthy();
      expect(mapping.image).toMatch(/^https:\/\/cdn\.shopify\.com\//);
      const matched = OFFICIAL_PRODUCT_VARIANTS.some((entry) => {
        const resolved = findRemasteredOfficialVariant(entry.product, entry.size);
        return resolved?.officialKey === key;
      });
      expect(matched, key).toBe(true);
    }
  });
});
