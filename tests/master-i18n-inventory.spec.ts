import { describe, expect, it } from 'vitest';
import { OFFICIAL_PRODUCT_VARIANTS } from '../src/official-product-master';

describe('temporary master localization inventory', () => {
  it('prints unique product-detail master strings', () => {
    const unique = <K extends keyof (typeof OFFICIAL_PRODUCT_VARIANTS)[number]>(key: K) =>
      [...new Set(OFFICIAL_PRODUCT_VARIANTS.map((entry) => String(entry[key])))]
        .sort((a, b) => a.localeCompare(b));

    console.log('MASTER_I18N_PRODUCTS=' + JSON.stringify(unique('product')));
    console.log('MASTER_I18N_INGREDIENTS=' + JSON.stringify(unique('ingredients')));
    console.log('MASTER_I18N_ALLERGENS=' + JSON.stringify(unique('allergens')));
    console.log('MASTER_I18N_USAGE=' + JSON.stringify(unique('usage')));
    console.log('MASTER_I18N_STORAGE=' + JSON.stringify(unique('storage')));
    expect(OFFICIAL_PRODUCT_VARIANTS.length).toBe(55);
  });
});
