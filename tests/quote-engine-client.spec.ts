import { describe, expect, it } from 'vitest';

import {
  buildChannelMessage,
  normalizeEmail,
  normalizePhone,
  quoteFingerprint,
  type AcceptedQuote,
  type QuoteCustomerInput,
} from '../src/quote-engine-client';

const customer: QuoteCustomerInput = {
  type: 'company',
  companyName: 'Test GmbH',
  vatNumber: 'DE123456789',
  firstName: 'Anna',
  lastName: 'Muster',
  countryCode: 'DE',
  email: 'anna@example.de',
  phone: '+491701234567',
  street: 'Musterstrasse',
  streetNumber: '12',
  postalCode: '10115',
  city: 'Berlin',
};

const quote: AcceptedQuote = {
  quoteId: 'HOT-Q-2026-000123',
  status: 'ACCEPTED',
  currency: 'EUR',
  totalExVat: 102,
  createdAt: '2026-08-23T12:00:00.000Z',
  lines: [{
    sku: '5430004174417',
    name: 'Truffle Sauce',
    cases: 2,
    unitsPerCase: 6,
    totalUnits: 12,
    finalUnitPriceExVat: 8.5,
    subtotalExVat: 102,
  }],
};

describe('quote engine browser contract', () => {
  it('normalizes transactional contact data without adding marketing state', () => {
    expect(normalizeEmail('  ANNA@EXAMPLE.DE ')).toBe('anna@example.de');
    expect(normalizePhone('0049 170 123 4567')).toBe('+491701234567');
  });

  it('rejects non-international phone numbers', () => {
    expect(() => normalizePhone('0170 1234567')).toThrow('phone');
  });

  it('produces a stable fingerprint from SKU and case quantity only', () => {
    const left = quoteFingerprint([
      { sku: 'B', cases: 3 },
      { sku: 'A', cases: 2 },
    ], 'whatsapp');
    const right = quoteFingerprint([
      { sku: 'A', cases: 2 },
      { sku: 'B', cases: 3 },
    ], 'whatsapp');
    expect(left).toBe(right);
    expect(left).not.toBe(quoteFingerprint([{ sku: 'A', cases: 2 }, { sku: 'B', cases: 4 }], 'whatsapp'));
  });

  it('builds a German customer handoff from the accepted server quote', () => {
    const message = buildChannelMessage('de', customer, quote);
    expect(message).toContain('Angebotsanfrage');
    expect(message).toContain('Referenz: HOT-Q-2026-000123');
    expect(message).toContain('USt-IdNr.: DE123456789');
    expect(message).toContain('Gesamt: €102.00 zzgl. MwSt.');
  });

  it('uses only accepted server values in the channel message', () => {
    const message = buildChannelMessage('en', customer, quote);
    expect(message).toContain('€102.00');
    expect(message).toContain('Truffle Sauce');
    expect(message).toContain('HOT-Q-2026-000123');
  });
});
