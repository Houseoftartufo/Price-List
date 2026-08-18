import { describe, expect, it } from 'vitest';

import { OFFICIAL_MASTER_COUNTS } from '../src/official-product-master';
import { buildProductFormatFamilies, formatDisplayLabel } from '../src/product-format-groups';

describe('product format families', () => {
  it('groups the 55 official variants into the official product families', () => {
    const families = buildProductFormatFamilies();
    expect(families).toHaveLength(OFFICIAL_MASTER_COUNTS.families);
    expect(families.flatMap((family) => family.variants)).toHaveLength(OFFICIAL_MASTER_COUNTS.variants);
  });

  it('unifies jar formats for Summer Truffle Carpaccio', () => {
    const family = buildProductFormatFamilies().find((entry) => entry.product === 'Summer Truffle Carpaccio');
    expect(family?.variants.map((variant) => variant.size)).toEqual(['45g', '80g', '170g', '500g']);
  });

  it('unifies all formats of truffle honey', () => {
    const family = buildProductFormatFamilies().find((entry) => entry.product === 'Acacia Honey with Truffle');
    expect(family?.variants.map((variant) => variant.size)).toEqual(['110g', '220g', '650g']);
  });

  it('groups oil bottle and bulk formats in the same product family', () => {
    const whiteOil = buildProductFormatFamilies().find((entry) => entry.product === 'White Truffle Extra Virgin Olive Oil');
    const blackOil = buildProductFormatFamilies().find((entry) => entry.product === 'Black Truffle Extra-Virgin Olive Oil');

    expect(whiteOil?.variants.some((variant) => variant.size === '100ml')).toBe(true);
    expect(whiteOil?.variants.some((variant) => variant.size === '3L')).toBe(true);
    expect(blackOil?.variants.some((variant) => variant.size === '1L')).toBe(true);
    expect(blackOil?.variants.some((variant) => variant.size === '3L')).toBe(true);
  });

  it('shows litre and kilogram formats in buyer-friendly labels without changing master data', () => {
    expect(formatDisplayLabel('1000ml')).toBe('1L');
    expect(formatDisplayLabel('3000ml')).toBe('3L');
    expect(formatDisplayLabel('5000ml')).toBe('5L');
    expect(formatDisplayLabel('1000g')).toBe('1kg');
    expect(formatDisplayLabel('500ml')).toBe('500ml');
  });
});
