import { describe, expect, it } from 'vitest';
import { CATEGORY_TRANSLATION_KEYS, PREVIEW_COPY, SUPPORTED_LOCALES } from '../src/i18n/i18n';

describe('preview i18n', () => {
  it('keeps the same UI keys in every supported locale', () => {
    const reference = Object.keys(PREVIEW_COPY.en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(PREVIEW_COPY[locale]).sort()).toEqual(reference);
      for (const key of reference) expect(PREVIEW_COPY[locale][key]?.trim()).toBeTruthy();
    }
  });

  it('defines source translation keys for all eight catalogue categories', () => {
    expect(Object.keys(CATEGORY_TRANSLATION_KEYS)).toHaveLength(8);
    expect(new Set(Object.values(CATEGORY_TRANSLATION_KEYS)).size).toBe(8);
  });
});
