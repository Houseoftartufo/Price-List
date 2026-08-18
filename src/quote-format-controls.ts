import {
  quoteFormatFamilyForSku,
  renderQuoteFormatTools,
  type QuoteFormatLocale,
} from './quote-format-manager';
import {
  loadShopifyLiveCatalogue,
  matchShopifyLiveVariant,
  shopifyGrossPriceToExVat,
  type ShopifyLivePayload,
} from './shopify-live';

const QUOTE_KEY = 'hot-price-list:quote:v1';

let shopifyPayload: ShopifyLivePayload | undefined;
let shopifyResolved = false;
let scheduled = false;

function locale(): QuoteFormatLocale {
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

function isOrderableSku(sku: string): boolean {
  // If the live feed is temporarily unavailable, the core catalogue owns the
  // verified fallback behavior. Do not incorrectly disable a valid format.
  if (!shopifyResolved || !shopifyPayload?.available) return true;
  const match = matchShopifyLiveVariant(shopifyPayload, sku);
  return Boolean(match && shopifyGrossPriceToExVat(match.variant.price) !== undefined);
}

function elementFromMarkup(markup: string): HTMLElement | undefined {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const element = template.content.firstElementChild;
  return element instanceof HTMLElement ? element : undefined;
}

function quoteSignature(sku: string, quote: Map<string, number>): string {
  return [
    locale(),
    sku,
    shopifyResolved ? 'live-resolved' : 'live-pending',
    [...quote.keys()].sort().join(','),
  ].join('|');
}

function enhanceQuoteLine(line: HTMLElement, quote: Map<string, number>): void {
  const remove = line.querySelector<HTMLButtonElement>('[data-remove-quote]');
  const sku = remove?.dataset.removeQuote;
  if (!sku) return;

  const signature = quoteSignature(sku, quote);
  const existing = line.querySelector<HTMLElement>('[data-quote-format-tools]');
  if (existing?.dataset.quoteFormatSignature === signature) return;
  existing?.remove();

  const name = line.querySelector<HTMLElement>('.quote-line-name');
  if (!name) return;
  const markup = renderQuoteFormatTools({
    sku,
    locale: locale(),
    quoteSkus: new Set(quote.keys()),
    isOrderableSku,
  });
  const tools = elementFromMarkup(markup);
  if (!tools) return;
  tools.dataset.quoteFormatSignature = signature;
  name.insertAdjacentElement('afterend', tools);
}

function enhanceQuote(): void {
  const quote = readQuote();
  document.querySelectorAll<HTMLElement>('#quote-lines .quote-line').forEach((line) => enhanceQuoteLine(line, quote));
}

function scheduleEnhancement(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    enhanceQuote();
  });
}

function proxyQuantityChange(sku: string, quantity: number): void {
  const rows = document.getElementById('product-rows');
  if (!rows || !Number.isInteger(quantity) || quantity < 1) return;
  const input = document.createElement('input');
  input.type = 'number';
  input.hidden = true;
  input.value = String(Math.min(quantity, 999));
  input.dataset.qtyInput = sku;
  rows.append(input);
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.remove();
}

function proxyAddToQuote(sku: string, quantity: number): void {
  const rows = document.getElementById('product-rows');
  if (!rows) return;
  proxyQuantityChange(sku, quantity);
  const button = document.createElement('button');
  button.type = 'button';
  button.hidden = true;
  button.dataset.addQuote = sku;
  rows.append(button);
  button.click();
  button.remove();
}

function proxyRemoveFromQuote(sku: string): void {
  const lines = document.getElementById('quote-lines');
  if (!lines) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.hidden = true;
  button.dataset.removeQuote = sku;
  lines.append(button);
  button.click();
  button.remove();
}

function syncCatalogueFormat(sku: string): void {
  const family = quoteFormatFamilyForSku(sku);
  if (!family) return;
  const selector = [...document.querySelectorAll<HTMLSelectElement>('[data-format-select]')]
    .find((select) => select.dataset.productFamily === family.product);
  if (!selector || ![...selector.options].some((option) => option.value === sku)) return;
  selector.value = sku;
  selector.dispatchEvent(new Event('change', { bubbles: true }));
}

function replaceQuoteFormat(fromSku: string, toSku: string): void {
  if (fromSku === toSku || !isOrderableSku(toSku)) return;
  const quote = readQuote();
  const quantity = quote.get(fromSku);
  if (!quantity || quote.has(toSku)) return;

  proxyAddToQuote(toSku, quantity);
  proxyRemoveFromQuote(fromSku);
  syncCatalogueFormat(toSku);
  window.dispatchEvent(new CustomEvent('hot:quote-format-updated', {
    detail: { action: 'replace', fromSku, toSku, quantity },
  }));
}

function addQuoteFormat(sku: string): void {
  if (!isOrderableSku(sku)) return;
  const quote = readQuote();
  if (quote.has(sku)) return;
  proxyAddToQuote(sku, 1);
  window.dispatchEvent(new CustomEvent('hot:quote-format-updated', {
    detail: { action: 'add', toSku: sku, quantity: 1 },
  }));
}

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || !target.matches('[data-quote-format-select]')) return;
  const fromSku = target.dataset.fromSku;
  if (!fromSku) return;
  replaceQuoteFormat(fromSku, target.value);
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const add = target.closest<HTMLButtonElement>('[data-quote-add-format-sku]');
  const sku = add?.dataset.quoteAddFormatSku;
  if (sku) addQuoteFormat(sku);
});

const quoteLines = document.getElementById('quote-lines');
if (quoteLines) {
  const observer = new MutationObserver(scheduleEnhancement);
  observer.observe(quoteLines, { childList: true, subtree: true });
}

const localeObserver = new MutationObserver(scheduleEnhancement);
localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

void loadShopifyLiveCatalogue().then((payload) => {
  shopifyPayload = payload;
  shopifyResolved = true;
  scheduleEnhancement();
});

scheduleEnhancement();

export {};
