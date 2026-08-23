import type { Env } from '../env';
import type { CanonicalQuote, Locale, QuoteCustomerInput } from '../types';

const ATTIO_BASE_URL = 'https://api.attio.com/v2';
const PUBLIC_EMAIL_DOMAINS = new Set([
  'aol.com',
  'gmail.com',
  'googlemail.com',
  'gmx.com',
  'gmx.de',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'mac.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
  'yahoo.fr',
]);

interface AttioRecordResponse {
  data: {
    id: { record_id: string };
    web_url?: string;
  };
}

interface AttioQueryResponse {
  data: Array<{
    id: { record_id: string };
    values?: Record<string, unknown>;
  }>;
}

function headers(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.ATTIO_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function attioFetch<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ATTIO_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(env), ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Attio HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  return await response.json() as T;
}

function location(customer: QuoteCustomerInput) {
  return {
    line_1: `${customer.street} ${customer.streetNumber}${customer.addressLine2 ? `, ${customer.addressLine2}` : ''}`,
    locality: customer.city,
    postcode: customer.postalCode,
    country_code: customer.countryCode,
  };
}

function preferredLanguage(locale: Locale): string | undefined {
  const values: Partial<Record<Locale, string>> = {
    en: 'English',
    fr: 'French',
    it: 'Italian',
    nl: 'Dutch',
    de: 'German',
  };
  // Attio currently has no German option in Preferred Language. The exact DE locale
  // remains first-class in the immutable quote snapshot and the Deal note.
  return values[locale];
}

function preferredContactChannel(quote: CanonicalQuote): 'WhatsApp' | 'Email' {
  return quote.preferredChannel === 'whatsapp' ? 'WhatsApp' : 'Email';
}

function normalizeVat(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function corporateDomain(email: string): string | undefined {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) return undefined;
  return domain;
}

async function mappedCompanyId(env: Env, vatNumber: string): Promise<string | undefined> {
  const identityValue = normalizeVat(vatNumber);
  const row = await env.DB.prepare(`
    SELECT attio_record_id FROM attio_identity_map
    WHERE identity_type = 'company_vat' AND identity_value = ?
  `).bind(identityValue).first<{ attio_record_id: string }>();
  return row?.attio_record_id;
}

async function saveCompanyMapping(env: Env, vatNumber: string, recordId: string): Promise<void> {
  const identityValue = normalizeVat(vatNumber);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO attio_identity_map (identity_type, identity_value, attio_record_id, created_at, updated_at)
    VALUES ('company_vat', ?, ?, ?, ?)
    ON CONFLICT(identity_type, identity_value) DO UPDATE SET
      attio_record_id = excluded.attio_record_id,
      updated_at = excluded.updated_at
  `).bind(identityValue, recordId, now, now).run();
}

async function queryExactDealName(env: Env, name: string): Promise<string[]> {
  const payload = await attioFetch<AttioQueryResponse>(env, '/objects/deals/records/query', {
    method: 'POST',
    body: JSON.stringify({ filter: { name }, limit: 10, offset: 0 }),
  });
  return payload.data.map((record) => record.id.record_id);
}

async function resolveCompany(env: Env, customer: QuoteCustomerInput): Promise<string | undefined> {
  if (customer.type !== 'company' || !customer.companyName) return undefined;
  if (!customer.vatNumber) throw new Error('Company VAT is required for Attio identity resolution.');

  const mapped = await mappedCompanyId(env, customer.vatNumber);
  if (mapped) return mapped;

  const domain = corporateDomain(customer.email);
  const values = {
    name: customer.companyName,
    primary_location: location(customer),
    vat_number: normalizeVat(customer.vatNumber),
    description: `House of Tartufo Price List customer · VAT ${normalizeVat(customer.vatNumber)}`,
    ...(domain ? { domains: [domain] } : {}),
  };

  const record = domain
    ? await attioFetch<AttioRecordResponse>(env, '/objects/companies/records?matching_attribute=domains', {
        method: 'PUT',
        body: JSON.stringify({ data: { values } }),
      })
    : await attioFetch<AttioRecordResponse>(env, '/objects/companies/records', {
        method: 'POST',
        body: JSON.stringify({ data: { values } }),
      });

  const recordId = record.data.id.record_id;
  await saveCompanyMapping(env, customer.vatNumber, recordId);
  return recordId;
}

async function upsertPerson(env: Env, quote: CanonicalQuote, companyId?: string): Promise<string> {
  const customer = quote.customer;
  const language = preferredLanguage(quote.locale);
  const values: Record<string, unknown> = {
    email_addresses: [customer.email],
    name: {
      first_name: customer.firstName,
      last_name: customer.lastName,
      full_name: `${customer.firstName} ${customer.lastName}`,
    },
    phone_numbers: [customer.phone],
    primary_location: location(customer),
    preferred_contact_channel: preferredContactChannel(quote),
    ...(language ? { preferred_language: language } : {}),
    ...(companyId ? { company: [{ target_object: 'companies', target_record_id: companyId }] } : {}),
  };

  const record = await attioFetch<AttioRecordResponse>(
    env,
    '/objects/people/records?matching_attribute=email_addresses',
    { method: 'PUT', body: JSON.stringify({ data: { values } }) },
  );
  return record.data.id.record_id;
}

function dealName(quote: CanonicalQuote): string {
  const customer = quote.customer.type === 'company'
    ? quote.customer.companyName || `${quote.customer.firstName} ${quote.customer.lastName}`
    : `${quote.customer.firstName} ${quote.customer.lastName}`;
  return `${quote.quoteId} · ${customer}`;
}

async function createQuoteNote(env: Env, quote: CanonicalQuote, dealId: string): Promise<void> {
  const customer = quote.customer;
  const lines = quote.lines
    .map((line) => `- **${line.sku}** · ${line.name} · ${line.cases} case(s) · €${line.subtotalExVat.toFixed(2)} ex VAT`)
    .join('\n');
  const content = [
    `# ${quote.quoteId}`,
    '',
    `**Source:** House of Tartufo Price List`,
    `**Locale:** ${quote.locale.toUpperCase()}`,
    `**Preferred contact:** ${quote.preferredChannel}`,
    `**Customer:** ${customer.firstName} ${customer.lastName}`,
    customer.companyName ? `**Company:** ${customer.companyName}` : undefined,
    customer.vatNumber ? `**VAT:** ${normalizeVat(customer.vatNumber)}` : undefined,
    `**Email:** ${customer.email}`,
    `**Phone:** ${customer.phone}`,
    `**Country:** ${customer.countryCode}`,
    `**Total:** €${quote.totalExVat.toFixed(2)} ex VAT`,
    '',
    '## Products',
    lines,
  ].filter((value): value is string => Boolean(value)).join('\n');

  try {
    await attioFetch(env, '/notes', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          parent_object: 'deals',
          parent_record_id: dealId,
          title: `${quote.quoteId} · Price List quotation request`,
          format: 'markdown',
          content,
        },
      }),
    });
  } catch (error) {
    console.warn('[HOT Price List] Attio note could not be created', {
      quoteId: quote.quoteId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function projectQuoteToAttio(env: Env, quote: CanonicalQuote): Promise<string> {
  const name = dealName(quote);
  const existing = await queryExactDealName(env, name);
  if (existing.length === 1) return existing[0]!;
  if (existing.length > 1) throw new Error(`Duplicate Attio deals already exist for ${quote.quoteId}.`);

  const companyId = await resolveCompany(env, quote.customer);
  const personId = await upsertPerson(env, quote, companyId);

  const created = await attioFetch<AttioRecordResponse>(env, '/objects/deals/records', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        values: {
          name,
          stage: 'Quotation Preparing',
          owner: env.ATTIO_DEAL_OWNER_EMAIL || 'marketing@houseoftartufo.com',
          value: quote.totalExVat,
          associated_people: [{ target_object: 'people', target_record_id: personId }],
          ...(companyId ? { associated_company: [{ target_object: 'companies', target_record_id: companyId }] } : {}),
          opportunity_type: 'Quotation Request',
          quotation_status: 'Preparing',
          opportunity_channel: preferredContactChannel(quote),
        },
      },
    }),
  });

  const dealId = created.data.id.record_id;
  await createQuoteNote(env, quote, dealId);
  return dealId;
}
