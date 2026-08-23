import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncCanonicalCatalogue } from '../src/catalogue';
import { acceptQuote } from '../src/quote-service';
import type { Env } from '../src/env';
import type { CanonicalProduct, QuoteRequestInput } from '../src/types';

const OFFICIAL_SKU = '5430004174134';
const SHEET_CSV = `HOUSE OF TARTUFO — PRODUCT PRICE LIST 2026,,,,,,\nBase prices,,,,,,\nCode,Product Name,Shelf Life,Weight/Vol,Qty/Box,€/unit (base),€/box (base)\n── SAUCES & CONDIMENTS,,,,,,\n28,White Truffled Sauce – Bianchetto Truffle 2%,3 years,170g,12,€10.00,€120.00\n`;

function shopifyResponse() {
  const translated = [
    { key: 'title', value: 'White Truffle Sauce', outdated: false },
    { key: 'body_html', value: '<p>White truffle sauce</p>', outdated: false },
  ];
  return {
    data: {
      products: {
        nodes: [{
          id: 'gid://shopify/Product/1',
          title: 'White Truffle Sauce',
          handle: 'white-truffle-sauce',
          status: 'ACTIVE',
          updatedAt: '2026-08-24T00:00:00.000Z',
          descriptionHtml: '<p>White truffle sauce</p>',
          fr: translated,
          it: translated,
          nl: translated,
          de: translated,
          media: { nodes: [{ image: { url: 'https://cdn.shopify.com/white.webp' }, alt: 'White sauce' }] },
          metafields: { nodes: [] },
          variants: { nodes: [{
            id: 'gid://shopify/ProductVariant/1',
            title: '170g',
            sku: OFFICIAL_SKU,
            availableForSale: true,
            inventoryQuantity: 20,
            selectedOptions: [{ name: 'Size', value: '170g' }],
            media: { nodes: [] },
            metafields: { nodes: [{ namespace: 'hot', key: 'units_per_case', type: 'number_integer', value: '12' }] },
          }] },
        }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    },
  };
}

function installProviderFetch() {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('docs.google.com/spreadsheets')) {
      return new Response(SHEET_CSV, { status: 200, headers: { 'Content-Type': 'text/csv' } });
    }
    if (url.includes('.myshopify.com/admin/api/')) {
      return Response.json(shopifyResponse());
    }
    if (url.includes('api.billit.be/v1/products')) {
      return Response.json({
        Items: [{
          ProductID: 999,
          Reference: OFFICIAL_SKU,
          Description: 'WRONG BILLIT PRICE SOURCE',
          AmountExcl: 99,
          VAT: 6,
          Unit: 'NAR',
        }],
        NextPageLink: null,
      });
    }
    throw new Error(`Unexpected fetch ${url}`);
  }));
  return calls;
}

function makeDb(existingProduct?: CanonicalProduct) {
  const catalogueWrites: Array<{ publicJson: string; internalJson: string }> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM quotes WHERE idempotency_key')) return null;
              if (sql.includes('SELECT public_json FROM catalogue_products WHERE sku')) {
                return existingProduct ? { public_json: JSON.stringify(existingProduct) } : null;
              }
              if (sql.includes('SELECT internal_json FROM catalogue_products WHERE sku')) {
                return { internal_json: '{}' };
              }
              if (sql.includes('RETURNING next_value')) return { next_value: 1 };
              return null;
            },
            async run() {
              if (sql.includes('INSERT INTO catalogue_products')) {
                catalogueWrites.push({ publicJson: String(values[1]), internalJson: String(values[2]) });
              }
              return { success: true, results: [], meta: {} };
            },
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
    async batch() {
      return [];
    },
  } as unknown as D1Database;
  return { db, catalogueWrites };
}

function env(db: D1Database): Env {
  return {
    DB: db,
    QUOTE_JOBS: {} as Queue,
    BILLIT_API_KEY: 'test-billit-key',
    BILLIT_PARTY_ID: 'test-party',
    SHOPIFY_SHOP_DOMAIN: 'cc4fd8.myshopify.com',
    SHOPIFY_ADMIN_ACCESS_TOKEN: 'test-shopify-token',
    ATTIO_API_KEY: 'test-attio-token',
  };
}

const projected: CanonicalProduct = {
  sku: OFFICIAL_SKU,
  name: 'Tartufata White Sauce (with Bianchetto 2%)',
  currency: 'EUR',
  basePriceExVat: 10,
  vatRate: 6,
  unit: 'NAR',
  sizeLabel: '170g',
  unitsPerCase: 12,
  availability: 'IN_STOCK',
  imageUrl: 'https://cdn.shopify.com/white.webp',
  health: 'READY',
  healthReasons: [],
  verifiedAt: '2026-08-24T00:00:00.000Z',
};

const input: QuoteRequestInput = {
  idempotencyKey: 'test-sheet-authority-1',
  locale: 'en',
  preferredChannel: 'email',
  customer: {
    type: 'company',
    companyName: 'Test Buyer BV',
    vatNumber: 'BE0123456789',
    firstName: 'Test',
    lastName: 'Buyer',
    countryCode: 'BE',
    email: 'buyer@example.com',
    phone: '+32470000000',
    street: 'Rue Test',
    streetNumber: '1',
    postalCode: '1000',
    city: 'Brussels',
  },
  lines: [{ sku: OFFICIAL_SKU, cases: 1 }],
};

describe('Price List commercial source authority', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('syncs Sheet/master commercial price and identity instead of Billit product pricing', async () => {
    const calls = installProviderFetch();
    const { db, catalogueWrites } = makeDb();

    await syncCanonicalCatalogue(env(db), 'sync-test');

    const write = catalogueWrites.find((entry) => JSON.parse(entry.publicJson).sku === OFFICIAL_SKU);
    expect(write).toBeDefined();
    expect(JSON.parse(write!.publicJson)).toMatchObject({
      sku: OFFICIAL_SKU,
      basePriceExVat: 10,
      unitsPerCase: 12,
    });
    expect(JSON.parse(write!.internalJson)).toMatchObject({
      sheetSourceCode: '28',
      sourceStatus: { sheet: 'ok', shopify: 'ok' },
    });
    expect(calls.some((url) => url.includes('api.billit.be/v1/products'))).toBe(false);
  });

  it('re-verifies Sheet + Shopify at quote acceptance without consulting Billit for price', async () => {
    const calls = installProviderFetch();
    const { db } = makeDb(projected);

    const result = await acceptQuote(env(db), 'quote-test', input);

    expect(result.quote.lines[0]).toMatchObject({
      sku: OFFICIAL_SKU,
      baseUnitPriceExVat: 10,
      unitsPerCase: 12,
      subtotalExVat: 120,
    });
    expect(calls.some((url) => url.includes('api.billit.be/v1/products'))).toBe(false);
  });
});
