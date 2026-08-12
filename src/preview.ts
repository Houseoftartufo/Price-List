import './styles/preview.css';

import { loadCatalogue } from './catalog/catalog-service';
import { calculatePriceBreakdown, formatEur, roundMoney } from './catalog/pricing';
import type { Catalogue, Product } from './catalog/types';
import {
  categoryText,
  getInitialLocale,
  loadTranslations,
  setDocumentLocale,
  sourceText,
  uiText,
  type Locale,
  type TranslationBundle,
} from './i18n/i18n';

const QUOTE_KEY = 'hot-price-list:quote:v1';
const WHATSAPP_NUMBER = '32480205715';

interface Filters {
  query: string;
  category: string;
  line: 'all' | 'standard' | 'natural';
  truffle: 'all' | Product['truffleType'];
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required preview element #${id} is missing.`);
  return element as T;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function localeCode(current: Locale): string {
  return ({ en: 'en-BE', it: 'it-IT', fr: 'fr-BE', nl: 'nl-BE' } as const)[current];
}

function monthsLabel(months: number | undefined): string {
  if (!months) return '';
  if (months % 12 === 0) return `${months / 12}y`;
  return `${months}mo`;
}

let catalogue: Catalogue;
let translations: TranslationBundle;
let locale: Locale = getInitialLocale();
let sourceWarning: string | undefined;
let filters: Filters = {
  query: '',
  category: 'all',
  line: 'all',
  truffle: 'all',
};

const quantityBySku = new Map<string, number>();
const quote = new Map<string, number>();

const rowsEl = byId<HTMLTableSectionElement>('product-rows');
const searchEl = byId<HTMLInputElement>('catalogue-search');
const lineFilterEl = byId<HTMLSelectElement>('line-filter');
const truffleFilterEl = byId<HTMLSelectElement>('truffle-filter');
const categoryNavEl = byId<HTMLElement>('category-nav');
const resultEl = byId<HTMLElement>('catalogue-result');
const noticeEl = byId<HTMLElement>('catalogue-notice');
const emptyEl = byId<HTMLElement>('empty-state');
const tableEl = byId<HTMLTableElement>('catalogue-table');
const quoteDialog = byId<HTMLDialogElement>('quote-dialog');
const quoteLinesEl = byId<HTMLElement>('quote-lines');
const quoteSummaryEl = byId<HTMLElement>('quote-summary');
const quoteActionsEl = byId<HTMLElement>('quote-actions');

function money(value: number): string {
  return formatEur(value, localeCode(locale));
}

function productBySku(sku: string): Product | undefined {
  return catalogue.products.find((product) => product.sku === sku);
}

function readPersistedQuote(): void {
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<[string, number]>;
    for (const entry of parsed) {
      const sku = entry[0];
      const cases = entry[1];
      if (typeof sku === 'string' && Number.isInteger(cases) && cases > 0) {
        quote.set(sku, cases);
        quantityBySku.set(sku, cases);
      }
    }
  } catch (error) {
    console.warn('[HOT Price List] Could not restore quote.', error);
  }
}

function persistQuote(): void {
  try {
    window.localStorage.setItem(QUOTE_KEY, JSON.stringify([...quote.entries()]));
  } catch (error) {
    console.warn('[HOT Price List] Could not persist quote.', error);
  }
}

function hydrateFiltersFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const directSku = params.get('sku')?.trim();
  const query = directSku || params.get('q')?.trim() || '';
  const category = params.get('category')?.trim() || 'all';
  const line = params.get('line');
  const truffle = params.get('truffle');

  filters = {
    query,
    category,
    line: line === 'standard' || line === 'natural' ? line : 'all',
    truffle:
      truffle === 'white' ||
      truffle === 'black' ||
      truffle === 'summer' ||
      truffle === 'bianchetto' ||
      truffle === 'mixed' ||
      truffle === 'none'
        ? truffle
        : 'all',
  };

  searchEl.value = filters.query;
  lineFilterEl.value = filters.line;
  truffleFilterEl.value = filters.truffle ?? 'all';
}

function syncFiltersToUrl(): void {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.line !== 'all') params.set('line', filters.line);
  if (filters.truffle !== 'all' && filters.truffle) params.set('truffle', filters.truffle);
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

function applyStaticTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-ui]').forEach((element) => {
    const key = element.dataset.ui;
    if (key) element.textContent = uiText(locale, key);
  });

  document.querySelectorAll<HTMLOptionElement>('[data-ui-option]').forEach((option) => {
    const key = option.dataset.uiOption;
    if (key) option.textContent = uiText(locale, key);
  });

  searchEl.placeholder = uiText(locale, 'searchPlaceholder');
  byId<HTMLElement>('catalogue-title').textContent = sourceText(translations, locale, 'nav.slide1');
  byId<HTMLElement>('catalogue-eyebrow').textContent = uiText(locale, 'wholesale');

  document.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === locale));
  });
}

function updateSourceStatus(): void {
  const stateEl = byId<HTMLElement>('source-state');
  const labelEl = byId<HTMLElement>('source-state-text');
  const state = catalogue.freshness;
  stateEl.dataset.state = state;
  const key = state === 'fresh' ? 'verified' : state === 'stale' ? 'stale' : 'fallback';
  const verifiedDate = new Intl.DateTimeFormat(localeCode(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(catalogue.verifiedAt));
  labelEl.textContent = `${uiText(locale, key)} · ${verifiedDate}`;

  noticeEl.hidden = !sourceWarning;
  noticeEl.textContent = sourceWarning ?? '';
}

function renderMetrics(): void {
  const categories = new Set(catalogue.products.map((product) => product.categoryId));
  byId<HTMLElement>('metric-products').textContent = String(catalogue.products.length);
  byId<HTMLElement>('metric-categories').textContent = String(categories.size);
}

function renderCategories(): void {
  const categoryIds = [...new Set(catalogue.products.map((product) => product.categoryId))];
  if (filters.category !== 'all' && !categoryIds.includes(filters.category)) filters.category = 'all';

  categoryNavEl.innerHTML = [
    `<button class="category-chip" type="button" data-category="all" aria-pressed="${filters.category === 'all'}">${escapeHtml(uiText(locale, 'allCategories'))}</button>`,
    ...categoryIds.map(
      (categoryId) =>
        `<button class="category-chip" type="button" data-category="${escapeHtml(categoryId)}" aria-pressed="${filters.category === categoryId}">${escapeHtml(categoryText(translations, locale, categoryId))}</button>`,
    ),
  ].join('');
}

function filteredProducts(): Product[] {
  const query = filters.query.toLocaleLowerCase(localeCode(locale));
  return catalogue.products.filter((product) => {
    if (product.active === false) return false;
    if (filters.category !== 'all' && product.categoryId !== filters.category) return false;
    if (filters.line !== 'all' && product.line !== filters.line) return false;
    if (filters.truffle !== 'all' && product.truffleType !== filters.truffle) return false;
    if (!query) return true;

    const searchable = [
      product.sku,
      product.name,
      product.sizeLabel,
      product.categoryId,
      categoryText(translations, locale, product.categoryId),
    ]
      .join(' ')
      .toLocaleLowerCase(localeCode(locale));
    return searchable.includes(query);
  });
}

function productRow(product: Product): string {
  const cases = quantityBySku.get(product.sku) ?? 1;
  const current = calculatePriceBreakdown(product, cases, catalogue.discountPolicy);
  const base = calculatePriceBreakdown(product, 1, catalogue.discountPolicy);
  const best = calculatePriceBreakdown(product, 15, catalogue.discountPolicy);
  const inQuote = quote.has(product.sku);
  const meta = [categoryText(translations, locale, product.categoryId), monthsLabel(product.shelfLifeMonths)]
    .filter(Boolean)
    .join(' · ');

  return `<tr data-sku="${escapeHtml(product.sku)}">
    <td data-label="${escapeHtml(uiText(locale, 'product'))}">
      <div class="product-cell">
        <span class="sku-badge">${escapeHtml(product.sku)}</span>
        <span>
          <strong class="product-name">${escapeHtml(product.name)}</strong>
          <small class="product-meta">${escapeHtml(meta)}</small>
        </span>
      </div>
    </td>
    <td data-label="${escapeHtml(uiText(locale, 'size'))}">${escapeHtml(product.sizeLabel)}</td>
    <td data-label="${escapeHtml(uiText(locale, 'casePack'))}">${product.unitsPerCase}</td>
    <td data-label="${escapeHtml(uiText(locale, 'basePrice'))}" class="money base-price">
      ${escapeHtml(money(base.baseUnitPrice))}
      <small class="product-meta">${escapeHtml(money(base.baseCasePrice))} ${escapeHtml(uiText(locale, 'perCase'))}</small>
    </td>
    <td data-label="${escapeHtml(uiText(locale, 'bestPrice'))}" class="money best-price">
      ${escapeHtml(money(best.unitPrice))}
      <small class="product-meta">15+ ${escapeHtml(uiText(locale, 'cases').toLowerCase())}</small>
    </td>
    <td data-label="${escapeHtml(uiText(locale, 'cases'))}">
      <div class="quantity-control">
        <button type="button" data-qty-action="decrement" data-sku="${escapeHtml(product.sku)}" aria-label="Decrease cases">−</button>
        <input type="number" min="1" step="1" inputmode="numeric" value="${cases}" data-qty-input="${escapeHtml(product.sku)}" aria-label="${escapeHtml(uiText(locale, 'cases'))}" />
        <button type="button" data-qty-action="increment" data-sku="${escapeHtml(product.sku)}" aria-label="Increase cases">+</button>
      </div>
    </td>
    <td data-label="${escapeHtml(uiText(locale, 'yourPrice'))}">
      <div class="dynamic-price">
        <strong>${escapeHtml(money(current.unitPrice))}</strong>
        <small>${escapeHtml(money(current.casePrice))} ${escapeHtml(uiText(locale, 'perCase'))}</small>
        ${current.discountPercent > 0 ? `<span class="discount-pill">−${current.discountPercent}% ${escapeHtml(uiText(locale, 'discountTier'))}</span>` : ''}
      </div>
    </td>
    <td>
      <button class="add-button" type="button" data-add-quote="${escapeHtml(product.sku)}" data-in-quote="${String(inQuote)}">
        ${escapeHtml(uiText(locale, inQuote ? 'updateQuote' : 'addToQuote'))}
      </button>
    </td>
  </tr>`;
}

function renderProducts(): void {
  const products = filteredProducts();
  resultEl.textContent = `${products.length} / ${catalogue.products.length} ${uiText(locale, 'products')}`;
  emptyEl.hidden = products.length > 0;
  tableEl.hidden = products.length === 0;
  rowsEl.innerHTML = products.map(productRow).join('');
}

function updateQuantity(sku: string, next: number): void {
  if (!Number.isInteger(next) || next < 1) return;
  quantityBySku.set(sku, Math.min(next, 999));
  renderProducts();
}

function quoteText(): string {
  const lines = [...quote.entries()]
    .map(([sku, cases]) => {
      const product = productBySku(sku);
      if (!product) return undefined;
      const price = calculatePriceBreakdown(product, cases, catalogue.discountPolicy);
      return `• SKU ${product.sku} — ${product.name} — ${cases} ${uiText(locale, 'cases').toLowerCase()} — ${product.unitsPerCase} units/case — ${money(price.unitPrice)}${uiText(locale, 'perUnit')} — ${money(price.subtotal)}`;
    })
    .filter((line): line is string => Boolean(line));

  const total = [...quote.entries()].reduce((sum, [sku, cases]) => {
    const product = productBySku(sku);
    return product ? sum + calculatePriceBreakdown(product, cases, catalogue.discountPolicy).subtotal : sum;
  }, 0);

  return [
    'House of Tartufo — Wholesale Quote Request',
    '',
    ...lines,
    '',
    `${uiText(locale, 'total')}: ${money(roundMoney(total))}`,
    uiText(locale, 'exWorks'),
    `${uiText(locale, 'sourceUpdated')}: ${new Date(catalogue.verifiedAt).toLocaleString(localeCode(locale))}`,
  ].join('\n');
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function renderQuote(): void {
  for (const sku of [...quote.keys()]) {
    if (!productBySku(sku)) quote.delete(sku);
  }

  const entries = [...quote.entries()];
  const countEl = byId<HTMLElement>('quote-count');
  countEl.textContent = String(entries.length);
  byId<HTMLButtonElement>('quote-trigger').setAttribute(
    'aria-label',
    `${uiText(locale, 'quote')}: ${entries.length}`,
  );

  if (entries.length === 0) {
    quoteLinesEl.innerHTML = `<p class="quote-empty">${escapeHtml(uiText(locale, 'quoteEmpty'))}</p>`;
    quoteSummaryEl.hidden = true;
    quoteActionsEl.hidden = true;
    persistQuote();
    return;
  }

  let total = 0;
  let saving = 0;
  quoteLinesEl.innerHTML = entries
    .map(([sku, cases]) => {
      const product = productBySku(sku);
      if (!product) return '';
      const price = calculatePriceBreakdown(product, cases, catalogue.discountPolicy);
      total += price.subtotal;
      saving += price.saving;
      return `<article class="quote-line">
        <div>
          <div class="quote-line-name">${escapeHtml(product.name)}</div>
          <div class="quote-line-meta">SKU ${escapeHtml(product.sku)} · ${cases} ${escapeHtml(uiText(locale, 'cases').toLowerCase())} · ${product.unitsPerCase}/case · ${escapeHtml(money(price.unitPrice))}${escapeHtml(uiText(locale, 'perUnit'))}</div>
          <button type="button" class="remove-line" data-remove-quote="${escapeHtml(product.sku)}">${escapeHtml(uiText(locale, 'remove'))}</button>
        </div>
        <div class="quote-line-price">
          <strong>${escapeHtml(money(price.subtotal))}</strong>
          ${price.discountPercent > 0 ? `<span class="discount-pill">−${price.discountPercent}%</span>` : ''}
        </div>
      </article>`;
    })
    .join('');

  byId<HTMLElement>('quote-total').textContent = money(roundMoney(total));
  byId<HTMLElement>('quote-saving').textContent = money(roundMoney(saving));
  quoteSummaryEl.hidden = false;
  quoteActionsEl.hidden = false;
  byId<HTMLAnchorElement>('whatsapp-order').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(quoteText())}`;
  persistQuote();
}

function renderAll(): void {
  applyStaticTranslations();
  updateSourceStatus();
  renderMetrics();
  renderCategories();
  renderProducts();
  renderQuote();
}

function resetFilters(): void {
  filters = { query: '', category: 'all', line: 'all', truffle: 'all' };
  searchEl.value = '';
  lineFilterEl.value = 'all';
  truffleFilterEl.value = 'all';
  syncFiltersToUrl();
  renderCategories();
  renderProducts();
}

function bindEvents(): void {
  searchEl.addEventListener('input', () => {
    filters.query = searchEl.value.trim();
    syncFiltersToUrl();
    renderProducts();
  });

  lineFilterEl.addEventListener('change', () => {
    filters.line = lineFilterEl.value === 'standard' || lineFilterEl.value === 'natural' ? lineFilterEl.value : 'all';
    syncFiltersToUrl();
    renderProducts();
  });

  truffleFilterEl.addEventListener('change', () => {
    const value = truffleFilterEl.value;
    filters.truffle =
      value === 'white' ||
      value === 'black' ||
      value === 'summer' ||
      value === 'bianchetto' ||
      value === 'mixed' ||
      value === 'none'
        ? value
        : 'all';
    syncFiltersToUrl();
    renderProducts();
  });

  categoryNavEl.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-category]');
    if (!button?.dataset.category) return;
    filters.category = button.dataset.category;
    syncFiltersToUrl();
    renderCategories();
    renderProducts();
  });

  rowsEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const quantityButton = target.closest<HTMLButtonElement>('[data-qty-action]');
    if (quantityButton?.dataset.sku && quantityButton.dataset.qtyAction) {
      const current = quantityBySku.get(quantityButton.dataset.sku) ?? 1;
      updateQuantity(quantityButton.dataset.sku, quantityButton.dataset.qtyAction === 'increment' ? current + 1 : Math.max(1, current - 1));
      return;
    }

    const addButton = target.closest<HTMLButtonElement>('[data-add-quote]');
    const sku = addButton?.dataset.addQuote;
    if (!sku) return;
    quote.set(sku, quantityBySku.get(sku) ?? 1);
    renderProducts();
    renderQuote();
  });

  rowsEl.addEventListener('change', (event) => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-qty-input]');
    const sku = input?.dataset.qtyInput;
    if (!input || !sku) return;
    const value = Number.parseInt(input.value, 10);
    updateQuantity(sku, Number.isInteger(value) && value > 0 ? value : 1);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.locale;
      if (next !== 'en' && next !== 'it' && next !== 'fr' && next !== 'nl') return;
      locale = next;
      setDocumentLocale(locale);
      renderAll();
    });
  });

  byId<HTMLButtonElement>('quote-trigger').addEventListener('click', () => {
    renderQuote();
    quoteDialog.showModal();
  });
  byId<HTMLButtonElement>('quote-close').addEventListener('click', () => quoteDialog.close());
  quoteDialog.addEventListener('click', (event) => {
    if (event.target === quoteDialog) quoteDialog.close();
  });

  quoteLinesEl.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-quote]');
    const sku = button?.dataset.removeQuote;
    if (!sku) return;
    quote.delete(sku);
    renderProducts();
    renderQuote();
  });

  byId<HTMLButtonElement>('clear-quote').addEventListener('click', () => {
    quote.clear();
    renderProducts();
    renderQuote();
  });

  byId<HTMLButtonElement>('copy-order').addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const original = uiText(locale, 'copyOrder');
    try {
      await copyText(quoteText());
      button.textContent = uiText(locale, 'copied');
      window.setTimeout(() => {
        button.textContent = original;
      }, 1500);
    } catch (error) {
      console.error('[HOT Price List] Could not copy quote.', error);
    }
  });

  byId<HTMLButtonElement>('reset-filters').addEventListener('click', resetFilters);

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    if (event.key === '/' && !typing && !quoteDialog.open) {
      event.preventDefault();
      searchEl.focus();
    }
  });
}

async function initialise(): Promise<void> {
  try {
    const [catalogueResult, translationResult] = await Promise.all([loadCatalogue(), loadTranslations()]);
    catalogue = catalogueResult.catalogue;
    translations = translationResult;
    sourceWarning = catalogueResult.warning;
    setDocumentLocale(locale);
    hydrateFiltersFromUrl();
    readPersistedQuote();
    bindEvents();
    renderAll();
  } catch (error) {
    console.error('[HOT Price List] Preview initialization failed.', error);
    rowsEl.innerHTML = `<tr class="loading-row"><td colspan="8">Catalogue unavailable. Please try again later.</td></tr>`;
    const sourceState = byId<HTMLElement>('source-state');
    sourceState.dataset.state = 'error';
    byId<HTMLElement>('source-state-text').textContent = 'Catalogue unavailable';
  }
}

void initialise();
