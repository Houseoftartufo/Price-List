import { describe, expect, it } from 'vitest';
import { parseQuoteRequest } from '../src/validation';

const base = {
  idempotencyKey: 'quote_20260823_abcdef123456',
  locale: 'de',
  preferredChannel: 'whatsapp',
  customer: {
    type: 'company',
    companyName: 'Restaurant GmbH',
    vatNumber: 'DE123456789',
    firstName: 'Anna',
    lastName: 'Muster',
    countryCode: 'DE',
    email: 'anna@example.com',
    phone: '+491234567890',
    street: 'Hauptstrasse',
    streetNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
  },
  lines: [{ sku: '0048', cases: 5 }],
};

describe('quote request validation', () => {
  it('treats German as a first-class locale', () => {
    const parsed = parseQuoteRequest(base);
    expect(parsed.locale).toBe('de');
  });

  it('requires a company name for company customers', () => {
    const customer = { ...base.customer } as Record<string, unknown>;
    delete customer.companyName;
    expect(() => parseQuoteRequest({ ...base, customer })).toThrow(/Company name/);
  });

  it('rejects duplicate SKU lines', () => {
    expect(() => parseQuoteRequest({
      ...base,
      lines: [{ sku: '0048', cases: 5 }, { sku: '0048', cases: 2 }],
    })).toThrow(/Duplicate SKU/);
  });
});
