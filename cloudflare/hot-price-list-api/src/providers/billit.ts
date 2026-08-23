import { billitBaseUrl, type Env } from '../env';
import type { BillitCommercialProduct, CanonicalQuote } from '../types';

interface BillitProductPayload {
  ProductID?: number;
  Reference?: string;
  Description?: string;
  AmountExcl?: number;
  VAT?: number;
  Unit?: string;
  GroupID?: number;
  LastModified?: string;
}

interface BillitListResponse<T> {
  Items?: T[];
  NextPageLink?: string | null;
}

function headers(env: Env, requestId: string, idempotencyKey?: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ApiKey: env.BILLIT_API_KEY,
    PartyID: env.BILLIT_PARTY_ID,
    'X-Request-ID': requestId,
    ...(idempotencyKey ? { 'Idempotent-Key': idempotencyKey } : {}),
  };
}

async function billitFetch<T>(
  env: Env,
  requestId: string,
  pathOrUrl: string,
  init: RequestInit = {},
  idempotencyKey?: string,
): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${billitBaseUrl(env)}${pathOrUrl}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...headers(env, requestId, idempotencyKey), ...(init.headers || {}) },
      });
      if (response.ok) return await response.json() as T;

      const message = await response.text();
      const error = new Error(`Billit HTTP ${response.status}: ${message.slice(0, 300)}`);
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }

  throw lastError ?? new Error('Billit request failed.');
}

function normalizeProduct(raw: BillitProductPayload): BillitCommercialProduct | undefined {
  const sku = raw.Reference?.trim();
  const name = raw.Description?.trim();
  const productId = Number(raw.ProductID);
  const amountExcl = Number(raw.AmountExcl);
  const vatRate = Number(raw.VAT);
  const unit = raw.Unit?.trim();

  if (!sku || !name || !Number.isInteger(productId) || productId <= 0) return undefined;
  if (!Number.isFinite(amountExcl) || amountExcl <= 0) return undefined;
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return undefined;
  if (!unit) return undefined;

  return {
    productId,
    sku,
    name,
    amountExcl,
    vatRate,
    unit,
    ...(Number.isFinite(Number(raw.GroupID)) ? { groupId: Number(raw.GroupID) } : {}),
    ...(raw.LastModified ? { lastModified: raw.LastModified } : {}),
  };
}

export async function listBillitProducts(env: Env, requestId: string): Promise<BillitCommercialProduct[]> {
  const products: BillitCommercialProduct[] = [];
  let next: string | null = '/v1/products';
  let page = 0;

  while (next && page < 50) {
    const payload = await billitFetch<BillitListResponse<BillitProductPayload>>(env, requestId, next);
    for (const raw of payload.Items ?? []) {
      const product = normalizeProduct(raw);
      if (product) products.push(product);
    }
    next = payload.NextPageLink || null;
    page += 1;
  }

  if (next) throw new Error('Billit product pagination exceeded safety limit.');
  return products;
}

export async function getBillitProductById(env: Env, requestId: string, productId: number): Promise<BillitCommercialProduct> {
  const raw = await billitFetch<BillitProductPayload>(env, requestId, `/v1/products/${productId}`);
  const product = normalizeProduct(raw);
  if (!product) throw new Error(`Billit product ${productId} is invalid or incomplete.`);
  return product;
}

function billitLanguage(locale: CanonicalQuote['locale']): string {
  return locale.toUpperCase();
}

export async function createBillitOffer(env: Env, requestId: string, quote: CanonicalQuote): Promise<number> {
  const customerName = quote.customer.type === 'company'
    ? quote.customer.companyName || `${quote.customer.firstName} ${quote.customer.lastName}`
    : `${quote.customer.firstName} ${quote.customer.lastName}`;

  const body = {
    OrderType: 'Offer',
    OrderDirection: 'Income',
    OrderNumber: quote.quoteId,
    Reference: quote.quoteId,
    OrderTitle: `House of Tartufo quotation ${quote.quoteId}`,
    OrderDate: quote.createdAt.slice(0, 10),
    ExpiryDate: new Date(Date.parse(quote.createdAt) + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    Currency: 'EUR',
    Customer: {
      Name: customerName,
      PartyType: 'Customer',
      Email: quote.customer.email,
      Phone: quote.customer.phone,
      Language: billitLanguage(quote.locale),
      Contact: `${quote.customer.firstName} ${quote.customer.lastName}`,
      ...(quote.customer.vatNumber ? { VATNumber: quote.customer.vatNumber } : {}),
      Addresses: [{
        AddressType: 'InvoiceAddress',
        Name: customerName,
        Street: quote.customer.street,
        StreetNumber: quote.customer.streetNumber,
        Zipcode: quote.customer.postalCode,
        City: quote.customer.city,
        CountryCode: quote.customer.countryCode,
        ...(quote.customer.addressLine2 ? { Box: quote.customer.addressLine2 } : {}),
      }],
    },
    OrderLines: quote.lines.map((line) => ({
      Quantity: line.totalUnits,
      UnitPriceExcl: line.finalUnitPriceExVat,
      Description: line.name,
      DescriptionExtended: `${line.cases} case(s) × ${line.unitsPerCase} unit(s)`,
      Reference: line.sku,
      VATPercentage: line.vatRate,
    })),
  };

  const orderId = await billitFetch<number>(env, requestId, '/v1/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  }, `hot-price-list:${quote.quoteId}`);

  if (!Number.isInteger(Number(orderId)) || Number(orderId) <= 0) throw new Error('Billit did not return a valid OrderID.');
  return Number(orderId);
}
