export type QuoteLocale = 'en' | 'it' | 'fr' | 'nl' | 'de';
export type QuoteChannel = 'whatsapp' | 'email';
export type QuoteCustomerType = 'company' | 'private';

export interface QuoteLineInput {
  sku: string;
  cases: number;
}

export interface QuoteCustomerInput {
  type: QuoteCustomerType;
  companyName?: string;
  vatNumber?: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  email: string;
  phone: string;
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  addressLine2?: string;
}

export interface QuoteRequestInput {
  idempotencyKey: string;
  locale: QuoteLocale;
  preferredChannel: QuoteChannel;
  customer: QuoteCustomerInput;
  lines: QuoteLineInput[];
}

export interface AcceptedQuoteLine {
  sku: string;
  name: string;
  cases: number;
  unitsPerCase: number;
  totalUnits: number;
  finalUnitPriceExVat: number;
  subtotalExVat: number;
}

export interface AcceptedQuote {
  quoteId: string;
  status: 'ACCEPTED';
  currency: 'EUR';
  totalExVat: number;
  lines: AcceptedQuoteLine[];
  createdAt: string;
}

export interface QuoteAcceptResponse {
  ok: true;
  duplicate: boolean;
  quote: AcceptedQuote;
}

const QUOTE_KEY = 'hot-price-list:quote:v1';
const LOCALE_KEY = 'hot-price-list:locale:v1';
const IDEMPOTENCY_PREFIX = 'hot-price-list:quote-idempotency:v1:';

function envValue(name: string): string | undefined {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env?.[name]?.trim() || undefined;
}

export function quoteEngineConfig(): { enabled: boolean; apiBase?: string } {
  const enabled = envValue('VITE_HOT_QUOTE_ENGINE_ENABLED') === 'true';
  const raw = envValue('VITE_HOT_QUOTE_API_URL');
  return {
    enabled,
    ...(raw ? { apiBase: raw.replace(/\/$/, '') } : {}),
  };
}

export function currentQuoteLocale(): QuoteLocale {
  try {
    const value = window.localStorage.getItem(LOCALE_KEY);
    if (value === 'en' || value === 'it' || value === 'fr' || value === 'nl' || value === 'de') return value;
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('it')) return 'it';
  if (browser.startsWith('fr')) return 'fr';
  if (browser.startsWith('nl')) return 'nl';
  if (browser.startsWith('de')) return 'de';
  return 'en';
}

export function readQuoteLines(): QuoteLineInput[] {
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const lines: QuoteLineInput[] = [];
    for (const item of parsed) {
      if (!Array.isArray(item) || item.length < 2) continue;
      const sku = typeof item[0] === 'string' ? item[0].trim() : '';
      const cases = Number(item[1]);
      if (!sku || seen.has(sku) || !Number.isInteger(cases) || cases < 1 || cases > 999) continue;
      seen.add(sku);
      lines.push({ sku, cases });
    }
    return lines;
  } catch {
    return [];
  }
}

function hashText(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function quoteFingerprint(lines: QuoteLineInput[], channel: QuoteChannel): string {
  const normalized = [...lines]
    .sort((left, right) => left.sku.localeCompare(right.sku))
    .map((line) => `${line.sku}:${line.cases}`)
    .join('|');
  return `${hashText(normalized)}:${channel}`;
}

export function idempotencyKeyFor(lines: QuoteLineInput[], channel: QuoteChannel): string {
  const storageKey = `${IDEMPOTENCY_PREFIX}${quoteFingerprint(lines, channel)}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = `hot-pl-${Date.now().toString(36)}-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return `hot-pl-${Date.now().toString(36)}-${crypto.randomUUID()}`;
  }
}

export function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const international = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (!/^\+[1-9]\d{6,14}$/.test(international)) {
    throw new Error('phone');
  }
  return international;
}

export function normalizeEmail(value: string): string {
  const clean = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) throw new Error('email');
  return clean;
}

export async function submitQuote(apiBase: string, input: QuoteRequestInput): Promise<QuoteAcceptResponse> {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/quotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => undefined) as QuoteAcceptResponse | { message?: string; code?: string } | undefined;
  if (!response.ok || !payload || payload.ok !== true) {
    const message = payload && 'message' in payload && payload.message ? payload.message : `Quote API returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

export function buildChannelMessage(
  locale: QuoteLocale,
  customer: QuoteCustomerInput,
  quote: AcceptedQuote,
): string {
  const labels: Record<QuoteLocale, {
    intro: string;
    ref: string;
    company: string;
    vat: string;
    contact: string;
    country: string;
    total: string;
    exVat: string;
  }> = {
    en: { intro: 'Hello House of Tartufo, here is our quotation request.', ref: 'Reference', company: 'Company', vat: 'VAT', contact: 'Contact', country: 'Country', total: 'Total', exVat: 'ex VAT' },
    it: { intro: 'Buongiorno House of Tartufo, ecco la nostra richiesta di preventivo.', ref: 'Riferimento', company: 'Azienda', vat: 'Partita IVA', contact: 'Contatto', country: 'Paese', total: 'Totale', exVat: 'IVA esclusa' },
    fr: { intro: 'Bonjour House of Tartufo, voici notre demande de devis.', ref: 'Référence', company: 'Société', vat: 'N° TVA', contact: 'Contact', country: 'Pays', total: 'Total', exVat: 'hors TVA' },
    nl: { intro: 'Hallo House of Tartufo, hierbij onze offerteaanvraag.', ref: 'Referentie', company: 'Bedrijf', vat: 'BTW-nummer', contact: 'Contact', country: 'Land', total: 'Totaal', exVat: 'excl. BTW' },
    de: { intro: 'Hallo House of Tartufo, hier ist unsere Angebotsanfrage.', ref: 'Referenz', company: 'Unternehmen', vat: 'USt-IdNr.', contact: 'Kontakt', country: 'Land', total: 'Gesamt', exVat: 'zzgl. MwSt.' },
  };
  const copy = labels[locale];
  const lines = quote.lines.map((line) => `• ${line.sku} · ${line.name} · ${line.cases} case(s) · €${line.subtotalExVat.toFixed(2)}`);
  return [
    copy.intro,
    '',
    `${copy.ref}: ${quote.quoteId}`,
    customer.companyName ? `${copy.company}: ${customer.companyName}` : undefined,
    customer.vatNumber ? `${copy.vat}: ${customer.vatNumber}` : undefined,
    `${copy.contact}: ${customer.firstName} ${customer.lastName}`,
    `Email: ${customer.email}`,
    `Phone: ${customer.phone}`,
    `${copy.country}: ${customer.countryCode}`,
    '',
    ...lines,
    '',
    `${copy.total}: €${quote.totalExVat.toFixed(2)} ${copy.exVat}`,
  ].filter((value): value is string => Boolean(value)).join('\n');
}
