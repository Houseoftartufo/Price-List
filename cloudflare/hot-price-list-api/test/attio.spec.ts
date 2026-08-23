import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { projectQuoteToAttio } from '../src/providers/attio';
import type { CanonicalQuote } from '../src/types';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeDb(): Env['DB'] {
  return {
    prepare() {
      return {
        bind() {
          return {
            first: async () => null,
            run: async () => ({ success: true, results: [], meta: {} }),
          };
        },
      };
    },
  } as unknown as Env['DB'];
}

const quote: CanonicalQuote = {
  quoteId: 'HOT-Q-2026-000123',
  status: 'ACCEPTED',
  locale: 'de',
  preferredChannel: 'whatsapp',
  customer: {
    type: 'company',
    companyName: 'Truffle GmbH',
    vatNumber: 'be 0123.456.789',
    firstName: 'Anna',
    lastName: 'Muster',
    countryCode: 'BE',
    email: 'anna@truffle.be',
    phone: '+32470000000',
    street: 'Rue Exemple',
    streetNumber: '10',
    postalCode: '1000',
    city: 'Brussels',
  },
  lines: [
    {
      sku: '1',
      name: 'Black Truffle Bolognese Ragout',
      cases: 2,
      unitsPerCase: 12,
      totalUnits: 24,
      baseUnitPriceExVat: 6.36,
      discountRate: 0.05,
      finalUnitPriceExVat: 6.04,
      casePriceExVat: 72.48,
      subtotalExVat: 144.96,
      vatRate: 6,
      availability: 'IN_STOCK',
    },
  ],
  totalExVat: 144.96,
  currency: 'EUR',
  createdAt: '2026-08-24T00:00:00.000Z',
  catalogueVerifiedAt: '2026-08-24T00:00:00.000Z',
};

describe('Attio Price List projection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('projects VAT, German locale and the selected quote channel into the live Attio schema', async () => {
    const calls: Array<{ url: string; method: string; body?: any }> = [];

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body });

      if (url.endsWith('/objects/deals/records/query')) return jsonResponse({ data: [] });
      if (url.includes('/objects/companies/records?matching_attribute=domains')) {
        return jsonResponse({ data: { id: { record_id: 'company-1' } } });
      }
      if (url.includes('/objects/people/records?matching_attribute=email_addresses')) {
        return jsonResponse({ data: { id: { record_id: 'person-1' } } });
      }
      if (url.endsWith('/objects/deals/records')) {
        return jsonResponse({ data: { id: { record_id: 'deal-1' } } });
      }
      if (url.endsWith('/notes')) return jsonResponse({ data: { id: { note_id: 'note-1' } } });
      throw new Error(`Unexpected Attio request: ${method} ${url}`);
    }));

    const env = {
      DB: fakeDb(),
      ATTIO_API_KEY: 'test-token',
      ATTIO_DEAL_OWNER_EMAIL: 'marketing@houseoftartufo.com',
    } as unknown as Env;

    await expect(projectQuoteToAttio(env, quote)).resolves.toBe('deal-1');

    const companyCall = calls.find((call) => call.url.includes('/objects/companies/records?matching_attribute=domains'));
    expect(companyCall?.body?.data?.values?.vat_number).toBe('BE0123456789');

    const personCall = calls.find((call) => call.url.includes('/objects/people/records?matching_attribute=email_addresses'));
    expect(personCall?.body?.data?.values?.preferred_language).toBe('German');
    expect(personCall?.body?.data?.values?.preferred_contact_channel).toBe('WhatsApp');

    const dealCall = calls.find((call) => call.url.endsWith('/objects/deals/records'));
    expect(dealCall?.body?.data?.values).toMatchObject({
      stage: 'Quotation Preparing',
      opportunity_type: 'Quotation Request',
      quotation_status: 'Preparing',
      opportunity_channel: 'WhatsApp',
    });
  });
});
