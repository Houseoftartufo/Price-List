import { buildCommercialQuoteMessages, type CommercialQuoteLine, type CommercialQuoteLocale } from './commercial-quote-message';
import { OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';
import { quoteFormatDisplayLabel } from './quote-format-manager';

const QUOTE_KEY = 'hot-price-list:quote:v1';
const masterBySku = new Map(OFFICIAL_PRODUCT_VARIANTS.map((entry) => [entry.sku, entry]));

function locale(): CommercialQuoteLocale {
  const value = document.documentElement.lang.toLowerCase();
  if (value.startsWith('it')) return 'it';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('nl')) return 'nl';
  return 'en';
}

function readQuote(): Map<string, number> {
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Array<[string, number]>;
    return new Map(
      parsed.filter(
        (entry): entry is [string, number] =>
          Array.isArray(entry)
          && typeof entry[0] === 'string'
          && Number.isInteger(entry[1])
          && entry[1] > 0,
      ),
    );
  } catch {
    return new Map();
  }
}

function roundMoney(value: number): number {
  return Math.round((value + 1e-9) * 100) / 100;
}

function parseMoney(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  let normalized = value.replace(/[\s\u00a0\u202f]/g, '').replace(/[^\d,.-]/g, '');
  if (!normalized) return undefined;

  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) normalized = normalized.replace(/\./g, '').replace(',', '.');
    else normalized = normalized.replace(/,/g, '');
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized = decimals === 2 ? normalized.replace(',', '.') : normalized.replace(/,/g, '');
  } else if (dot >= 0) {
    const decimals = normalized.length - dot - 1;
    if (decimals !== 2) normalized = normalized.replace(/\./g, '');
  }

  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function selectedFormat(line: HTMLElement, sku: string): string {
  const select = line.querySelector<HTMLSelectElement>('[data-quote-format-select]');
  const selected = select?.selectedOptions[0]?.textContent?.split(' · ')[0]?.trim();
  if (selected) return selected;

  const staticFormat = line.querySelector<HTMLElement>('.quote-format-static')?.textContent?.trim();
  if (staticFormat) return staticFormat;

  const master = masterBySku.get(sku);
  return quoteFormatDisplayLabel(master?.size ?? '');
}

function discountPercent(line: HTMLElement): number {
  const label = line.querySelector<HTMLElement>('.discount-pill')?.textContent ?? '';
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return match?.[1] ? Number.parseFloat(match[1].replace(',', '.')) : 0;
}

function lineFromDom(line: HTMLElement, quote: Map<string, number>): CommercialQuoteLine | undefined {
  const remove = line.querySelector<HTMLElement>('[data-remove-quote]');
  const sku = remove?.dataset.removeQuote;
  if (!sku) return undefined;

  const master = masterBySku.get(sku);
  const boxes = quote.get(sku);
  const subtotal = parseMoney(line.querySelector<HTMLElement>('.quote-line-price strong')?.textContent);
  if (!master || !boxes || subtotal === undefined || master.unitsPerCase < 1) return undefined;

  const totalUnits = boxes * master.unitsPerCase;
  const boxPrice = roundMoney(subtotal / boxes);
  const unitPrice = roundMoney(subtotal / totalUnits);

  return {
    name: line.querySelector<HTMLElement>('.quote-line-name')?.textContent?.trim() || master.product,
    size: selectedFormat(line, sku),
    sku,
    boxes,
    unitsPerBox: master.unitsPerCase,
    unitPrice,
    boxPrice,
    discountPercent: discountPercent(line),
    subtotal,
  };
}

function verifiedLabel(): string | undefined {
  const text = document.getElementById('source-state-text')?.textContent?.trim();
  if (!text) return undefined;
  const separator = text.indexOf('·');
  return separator >= 0 ? text.slice(separator + 1).trim() : text;
}

function commercialMessages() {
  const quote = readQuote();
  const lines = [...document.querySelectorAll<HTMLElement>('#quote-lines .quote-line')]
    .map((line) => lineFromDom(line, quote))
    .filter((line): line is CommercialQuoteLine => Boolean(line));
  if (lines.length === 0) return undefined;

  const total = parseMoney(document.getElementById('quote-total')?.textContent);
  const saving = parseMoney(document.getElementById('quote-saving')?.textContent);
  if (total === undefined || saving === undefined) return undefined;

  return buildCommercialQuoteMessages({
    locale: locale(),
    lines,
    total,
    saving,
    verifiedAtLabel: verifiedLabel(),
  });
}

function rewriteWhatsapp(messages: ReturnType<typeof buildCommercialQuoteMessages>): void {
  const link = document.getElementById('whatsapp-order');
  if (!(link instanceof HTMLAnchorElement) || !link.href.includes('wa.me/')) return;
  const url = new URL(link.href);
  url.searchParams.set('text', messages.whatsapp);
  link.href = url.toString();
  link.dataset.commercialMessageReady = 'true';
}

function rewriteEmail(messages: ReturnType<typeof buildCommercialQuoteMessages>): void {
  const link = document.getElementById('email-order');
  if (!(link instanceof HTMLAnchorElement)) return;
  const href = link.getAttribute('href') ?? '';
  if (!href.startsWith('mailto:')) return;

  const question = href.indexOf('?');
  const recipient = question >= 0 ? href.slice(0, question) : href;
  const params = new URLSearchParams(question >= 0 ? href.slice(question + 1) : '');
  params.set('body', messages.email);
  link.setAttribute('href', `${recipient}?${params.toString()}`);
  link.dataset.commercialMessageReady = 'true';
}

let scheduled = false;
function scheduleSync(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const messages = commercialMessages();
    if (!messages) return;
    rewriteWhatsapp(messages);
    rewriteEmail(messages);
  });
}

function bind(): void {
  const quoteLines = document.getElementById('quote-lines');
  if (quoteLines) {
    const quoteObserver = new MutationObserver(scheduleSync);
    quoteObserver.observe(quoteLines, { childList: true, subtree: true, characterData: true });
  }

  const localeObserver = new MutationObserver(scheduleSync);
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  window.addEventListener('hot:quote-format-updated', scheduleSync);
  scheduleSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
else bind();

export {};
