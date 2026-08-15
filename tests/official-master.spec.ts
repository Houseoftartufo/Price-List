import { describe, expect, it } from 'vitest';
import { OFFICIAL_MASTER_COUNTS, OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';
import {
  OFFICIAL_VARIANT_COUNT,
  findRemasteredOfficialVariant,
} from '../src/official-product-remaster';
import { OFFICIAL_SHOPIFY_MAP } from '../src/official-shopify-map';

describe('official Master_file_prodotti product master', () => {
  it('contains exactly 55 official variants and every row resolves to itself', () => {
    expect(OFFICIAL_VARIANT_COUNT).toBe(55);
    expect(OFFICIAL_PRODUCT_VARIANTS).toHaveLength(55);
    expect(OFFICIAL_MASTER_COUNTS).toEqual({
      variants: 55,
      families: expect.any(Number),
      withSku: 55,
      withBarcode: 55,
      withCasePack: 55,
    });

    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      const resolved = findRemasteredOfficialVariant(entry.product, entry.size);
      expect(resolved, `${entry.product} ${entry.size}`).toBeDefined();
      expect(resolved?.sku).toBe(entry.sku);
      expect(resolved?.barcode).toBe(entry.barcode);
      expect(resolved?.unitsPerCase).toBe(entry.unitsPerCase);
      expect(resolved?.ingredients).toBe(entry.ingredients);
      expect(resolved?.packStatus).toBe('resolved');
    }
  });

  it('includes the variants introduced or corrected by the new master', () => {
    expect(findRemasteredOfficialVariant('Tartufata White Sauce (with Bianchetto 2%)', '80g')?.sku).toBe('5430004174325');
    expect(findRemasteredOfficialVariant('Acacia Honey with Truffle', '650g')?.sku).toBe('5430004174301');
    expect(findRemasteredOfficialVariant('Truffle Tarallini', '200g')?.sku).toBe('5430004174479');
    expect(findRemasteredOfficialVariant('Balsamic Vinegar Pearls', '50ml')?.sku).toBe('5430004174578');
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '3L')?.sku).toBe('5430004174431');
    expect(findRemasteredOfficialVariant('Black Truffle Extra Virgin Olive Oil', '3L')?.sku).toBe('5430004174042');
  });

  it('normalizes equivalent unit notation while still rejecting non-master sizes', () => {
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '1000ml')?.sku).toBe('5430004174448');
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '3000 ml')?.sku).toBe('5430004174431');
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '500ml')).toBeUndefined();
    expect(findRemasteredOfficialVariant('Acacia Honey with Truffle', '450g')).toBeUndefined();
    expect(findRemasteredOfficialVariant('Pure White Truffle Cream', '80g')).toBeUndefined();
  });

  it('keeps 5% and 10% sauce identities unambiguous', () => {
    expect(findRemasteredOfficialVariant('Black Truffle Sauce 5%', '80g')?.sku).toBe('5430004174103');
    expect(findRemasteredOfficialVariant('Black Truffle Sauce 10%', '80g')?.sku).toBe('5430004174318');
    expect(findRemasteredOfficialVariant('Black Truffle Sauce', '80g')).toBeUndefined();
  });

  it('uses the exact case packs from the new master', () => {
    expect(findRemasteredOfficialVariant('Truffled Sauce – Summer Truffle 5%', '500g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('Tartufata White Sauce (with Bianchetto 2%)', '500g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '1L')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('White Truffle Extra Virgin Olive Oil', '5L')?.unitsPerCase).toBe(4);
    expect(findRemasteredOfficialVariant('Acacia Honey with Truffle', '650g')?.unitsPerCase).toBe(6);
    expect(findRemasteredOfficialVariant('Truffle Cashews', '80g')?.unitsPerCase).toBe(16);
    expect(findRemasteredOfficialVariant('Truffle Almonds', '80g')?.unitsPerCase).toBe(16);
    expect(findRemasteredOfficialVariant('Truffle Walnuts', '80g')?.unitsPerCase).toBe(16);
  });

  it('has no unresolved official SKU, barcode, or case pack', () => {
    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      expect(entry.sku).toMatch(/^\d{13}$/);
      expect(entry.barcode).toMatch(/^\d{14}$/);
      expect(entry.unitsPerCase).toBeGreaterThan(0);
    }
  });

  it('keeps every static Shopify fallback attached to one public-verified official SKU', () => {
    expect(Object.keys(OFFICIAL_SHOPIFY_MAP)).toHaveLength(21);
    for (const [key, mapping] of Object.entries(OFFICIAL_SHOPIFY_MAP)) {
      expect(mapping.handle).toBeTruthy();
      expect(mapping.siteSku).toMatch(/^\d{13}$/);
      expect(mapping.image).toMatch(/^https:\/\/cdn\.shopify\.com\//);
      const resolved = OFFICIAL_PRODUCT_VARIANTS
        .map((entry) => findRemasteredOfficialVariant(entry.product, entry.size))
        .find((entry) => entry?.officialKey === key);
      expect(resolved, key).toBeDefined();
      expect(resolved?.sku).toBe(mapping.siteSku);
    }
  });
});
