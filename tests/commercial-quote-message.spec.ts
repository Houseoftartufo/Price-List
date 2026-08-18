import { describe, expect, it } from 'vitest';

import { buildCommercialQuoteMessages, type CommercialQuoteLocale } from '../src/commercial-quote-message';

const lines = [
  {
    name: 'Summer Truffle Carpaccio',
    size: '170g',
    sku: '5430004174424',
    boxes: 3,
    unitsPerBox: 12,
    unitPrice: 6.62,
    boxPrice: 79.44,
    discountPercent: 10,
    subtotal: 238.32,
  },
  {
    name: 'Truffle Tarallini',
    size: '100g',
    sku: '5430004174332',
    boxes: 1,
    unitsPerBox: 12,
    unitPrice: 4.25,
    boxPrice: 51,
    discountPercent: 0,
    subtotal: 51,
  },
];

function messages(locale: CommercialQuoteLocale) {
  return buildCommercialQuoteMessages({
    locale,
    lines,
    total: 289.32,
    saving: 26.48,
    verifiedAtLabel: '18 Aug 2026, 17:45',
  });
}

describe('commercial quote messages', () => {
  it('keeps the same commercial information in all supported languages', () => {
    for (const locale of ['en', 'it', 'fr', 'nl'] as const) {
      const { whatsapp, email } = messages(locale);
      for (const output of [whatsapp, email]) {
        expect(output).toContain('Summer Truffle Carpaccio · 170g');
        expect(output).toContain('5430004174424');
        expect(output).toContain('Truffle Tarallini · 100g');
        expect(output).toContain('5430004174332');
        expect(output).toContain('−10%');
        expect(output).toContain('18 Aug 2026, 17:45');
      }
    }
  });

  it('formats WhatsApp with restrained bold hierarchy and no decorative emoji', () => {
    const { whatsapp } = messages('en');
    expect(whatsapp).toContain('*HOUSE OF TARTUFO — B2B QUOTE REQUEST*');
    expect(whatsapp).toContain('*1. Summer Truffle Carpaccio · 170g*');
    expect(whatsapp).toContain('Quantity: 3 boxes × 12 units = 36 units');
    expect(whatsapp).toContain('Volume discount: *−10%*');
    expect(whatsapp).toContain('*SUMMARY*');
    expect(whatsapp).toContain('Volume savings: *−€26.48*');
    expect(whatsapp).not.toMatch(/[✅📦💰🔥⭐]/u);
  });

  it('keeps email plain-text and structured without WhatsApp markdown', () => {
    const { email } = messages('en');
    expect(email).toContain('HOUSE OF TARTUFO — B2B QUOTE REQUEST');
    expect(email).toContain('----------------------------------------');
    expect(email).toContain('1. Summer Truffle Carpaccio · 170g');
    expect(email).toContain('Volume discount: −10%');
    expect(email).toContain('SUMMARY');
    expect(email).not.toContain('*');
  });

  it('uses the requested box terminology and localized commercial labels', () => {
    expect(messages('it').whatsapp).toContain('4 box');
    expect(messages('it').whatsapp).toContain('Sconto volume: *−10%*');
    expect(messages('it').whatsapp).toContain('*RIEPILOGO*');

    expect(messages('fr').whatsapp).toContain('4 box');
    expect(messages('fr').whatsapp).toContain('Remise volume: *−10%*');
    expect(messages('fr').whatsapp).toContain('*RÉCAPITULATIF*');

    expect(messages('nl').whatsapp).toContain('4 boxen');
    expect(messages('nl').whatsapp).toContain('Volumekorting: *−10%*');
    expect(messages('nl').whatsapp).toContain('*OVERZICHT*');
  });

  it('omits a zero-discount line while retaining discounted lines', () => {
    const { whatsapp } = messages('en');
    const taralliniSection = whatsapp.split('*2. Truffle Tarallini · 100g*')[1] ?? '';
    expect(taralliniSection.split('*SUMMARY*')[0]).not.toContain('Volume discount:');
  });
});
