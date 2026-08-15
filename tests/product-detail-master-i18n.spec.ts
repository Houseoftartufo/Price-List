import { describe, expect, it } from 'vitest';
import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';
import {
  hasMasterDetailTranslation,
  hasMasterTitleTranslation,
  translateMasterDetail,
  type MasterDetailField,
  type ProductDetailLocale,
} from '../src/product-detail-master-translations';

const locales: readonly ProductDetailLocale[] = ['en', 'it', 'fr', 'nl'];
const foreignLocales: readonly Exclude<ProductDetailLocale, 'it'>[] = ['en', 'fr', 'nl'];
const fields: readonly MasterDetailField[] = ['ingredients', 'allergens', 'usage', 'storage'];

describe('official product detail localization coverage', () => {
  it('covers every official title and technical master field in EN / IT / FR / NL', () => {
    expect(OFFICIAL_PRODUCT_VARIANTS).toHaveLength(55);

    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      for (const currentLocale of locales) {
        expect(hasMasterTitleTranslation(entry.product, currentLocale), `${entry.sku} title missing in ${currentLocale}`).toBe(true);
        for (const field of fields) {
          expect(
            hasMasterDetailTranslation(field, entry[field], currentLocale),
            `${entry.sku} ${field} missing in ${currentLocale}`,
          ).toBe(true);
        }
      }
    }
  });

  it('does not leak the Italian master string into foreign technical copy', () => {
    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      for (const currentLocale of foreignLocales) {
        for (const field of fields) {
          const translated = translateMasterDetail(field, entry[field], currentLocale);
          expect(translated.trim(), `${entry.sku} ${field} empty in ${currentLocale}`).not.toBe('');
          expect(
            translated,
            `${entry.sku} ${field} still equals Italian master in ${currentLocale}`,
          ).not.toBe(entry[field]);
        }
      }
    }
  });

  it('preserves the official Italian technical source verbatim', () => {
    for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
      for (const field of fields) {
        expect(translateMasterDetail(field, entry[field], 'it')).toBe(entry[field]);
      }
    }
  });
});
