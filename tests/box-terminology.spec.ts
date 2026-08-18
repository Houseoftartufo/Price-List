import { describe, expect, it } from 'vitest';

import '../src/box-terminology';
import { PREVIEW_COPY } from '../src/i18n/i18n';

describe('box terminology', () => {
  it('uses box terminology in every supported locale', () => {
    expect(PREVIEW_COPY.en.casePack).toBe('Units / box');
    expect(PREVIEW_COPY.en.cases).toBe('Boxes');
    expect(PREVIEW_COPY.en.perCase).toBe('/ box');
    expect(PREVIEW_COPY.en.volumePricingBody).toContain('boxes ordered');

    expect(PREVIEW_COPY.it.casePack).toBe('Pz / box');
    expect(PREVIEW_COPY.it.cases).toBe('Box');
    expect(PREVIEW_COPY.it.volumePricingBody).toContain('box ordinati');

    expect(PREVIEW_COPY.fr.casePack).toBe('Unités / box');
    expect(PREVIEW_COPY.fr.cases).toBe('Box');

    expect(PREVIEW_COPY.nl.casePack).toBe('Stuks / box');
    expect(PREVIEW_COPY.nl.cases).toBe('Boxen');
  });
});
