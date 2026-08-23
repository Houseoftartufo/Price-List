import type {
  ContactChannel,
  CustomerType,
  Locale,
  QuoteCustomerInput,
  QuoteRequestInput,
} from './types';

const LOCALES = new Set<Locale>(['en', 'fr', 'it', 'nl', 'de']);
const CHANNELS = new Set<ContactChannel>(['whatsapp', 'email']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

function requiredString(value: unknown, field: string, max = 160): string {
  if (typeof value !== 'string') throw new Error(`${field} is required.`);
  const clean = value.trim();
  if (!clean) throw new Error(`${field} is required.`);
  if (clean.length > max) throw new Error(`${field} is too long.`);
  return clean;
}

function optionalString(value: unknown, max = 160): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error('Invalid optional text field.');
  const clean = value.trim();
  if (!clean) return undefined;
  if (clean.length > max) throw new Error('Optional text field is too long.');
  return clean;
}

export function parseQuoteRequest(value: unknown): QuoteRequestInput {
  if (!value || typeof value !== 'object') throw new Error('Invalid quote request.');
  const input = value as Record<string, unknown>;

  const idempotencyKey = requiredString(input.idempotencyKey, 'idempotencyKey', 128);
  if (!/^[A-Za-z0-9:_-]{12,128}$/.test(idempotencyKey)) throw new Error('Invalid idempotency key.');

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
  const customerType: CustomerType = rawCustomer.type;

  const companyName = optionalString(rawCustomer.companyName, 180);
  const vatNumber = optionalString(rawCustomer.vatNumber, 40)?.replace(/[\s.\-]/g, '').toUpperCase();
  if (customerType === 'company' && !companyName) throw new Error('Company name is required for company customers.');

  const countryCode = requiredString(rawCustomer.countryCode, 'countryCode', 2).toUpperCase();
  if (!COUNTRY_RE.test(countryCode)) throw new Error('Invalid country code.');

  const email = requiredString(rawCustomer.email, 'email', 254).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Invalid email address.');

  const phone = requiredString(rawCustomer.phone, 'phone', 20).replace(/[\s()-]/g, '');
  if (!E164_RE.test(phone)) throw new Error('Phone must be normalized to E.164 format.');

  const addressLine2 = optionalString(rawCustomer.addressLine2, 160);
  const customer: QuoteCustomerInput = {
    type: customerType,
    ...(companyName ? { companyName } : {}),
    ...(vatNumber ? { vatNumber } : {}),
    firstName: requiredString(rawCustomer.firstName, 'firstName', 80),
    lastName: requiredString(rawCustomer.lastName, 'lastName', 80),
    countryCode,
    email,
    phone,
    street: requiredString(rawCustomer.street, 'street', 160),
    streetNumber: requiredString(rawCustomer.streetNumber, 'streetNumber', 32),
    postalCode: requiredString(rawCustomer.postalCode, 'postalCode', 32),
    city: requiredString(rawCustomer.city, 'city', 100),
    ...(addressLine2 ? { addressLine2 } : {}),
  };

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
