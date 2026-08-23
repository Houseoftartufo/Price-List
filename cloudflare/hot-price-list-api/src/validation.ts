import type { ContactChannel, Locale, QuoteRequestInput } from './types';

const LOCALES = new Set<Locale>(['en', 'fr', 'it', 'nl', 'de']);
const CHANNELS = new Set<ContactChannel>(['whatsapp', 'email']);

function requiredString(value: unknown, field: string, max = 160): string {
  if (typeof value !== 'string') throw new Error(`${field} is required.`);
  const clean = value.trim();
  if (!clean) throw new Error(`${field} is required.`);
  if (clean.length > max) throw new Error(`${field} is too long.`);
  return clean;
}

export function parseQuoteRequest(value: unknown): QuoteRequestInput {
  if (!value || typeof value !== 'object') throw new Error('Invalid quote request.');
  const input = value as Record<string, unknown>;

  const idempotencyKey = requiredString(input.idempotencyKey, 'idempotencyKey', 128);
  const locale = requiredString(input.locale, 'locale', 2).toLowerCase() as Locale;
  const preferredChannel = requiredString(input.preferredChannel, 'preferredChannel', 16).toLowerCase() as ContactChannel;
  if (!LOCALES.has(locale)) throw new Error('Unsupported locale.');
  if (!CHANNELS.has(preferredChannel)) throw new Error('Unsupported contact channel.');
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 50) {
    throw new Error('Quote must contain between 1 and 50 lines.');
  }

  if (!input.customer || typeof input.customer !== 'object') throw new Error('Customer details are required.');
  const rawCustomer = input.customer as Record<string, unknown>;
  if (rawCustomer.type !== 'company' && rawCustomer.type !== 'private') throw new Error('Invalid customer type.');

  const customer = {
    type: rawCustomer.type,
    ...(typeof rawCustomer.companyName === 'string' && rawCustomer.companyName.trim() ? { companyName: rawCustomer.companyName.trim() } : {}),
    ...(typeof rawCustomer.vatNumber === 'string' && rawCustomer.vatNumber.trim() ? { vatNumber: rawCustomer.vatNumber.trim().toUpperCase() } : {}),
    firstName: requiredString(rawCustomer.firstName, 'firstName', 80),
    lastName: requiredString(rawCustomer.lastName, 'lastName', 80),
    countryCode: requiredString(rawCustomer.countryCode, 'countryCode', 2).toUpperCase(),
    email: requiredString(rawCustomer.email, 'email', 254).toLowerCase(),
    phone: requiredString(rawCustomer.phone, 'phone', 32),
    street: requiredString(rawCustomer.street, 'street', 160),
    streetNumber: requiredString(rawCustomer.streetNumber, 'streetNumber', 32),
    postalCode: requiredString(rawCustomer.postalCode, 'postalCode', 32),
    city: requiredString(rawCustomer.city, 'city', 100),
    ...(typeof rawCustomer.addressLine2 === 'string' && rawCustomer.addressLine2.trim() ? { addressLine2: rawCustomer.addressLine2.trim() } : {}),
  };

  if (customer.type === 'company' && !customer.companyName) throw new Error('Company name is required for company customers.');

  const seen = new Set<string>();
  const lines = input.lines.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid quote line.');
    const line = raw as Record<string, unknown>;
    const sku = requiredString(line.sku, 'sku', 80);
    if (seen.has(sku)) throw new Error(`Duplicate SKU ${sku} in quote request.`);
    seen.add(sku);
    if (typeof line.cases !== 'number' || !Number.isInteger(line.cases) || line.cases < 1 || line.cases > 999) {
      throw new Error(`Invalid case quantity for SKU ${sku}.`);
    }
    return { sku, cases: line.cases };
  });

  return { idempotencyKey, locale, preferredChannel, customer, lines };
}
