import { OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from './official-product-master';
import { normalizeSearchText, searchOfficialProducts } from './universal-product-search';

let currentQuery = '';
let scheduledFrame = 0;

function restoreQueryInUrl(query: string): void {
  const url = new URL(window.location.href);
  if (query.trim()) url.searchParams.set('q', query.trim());
  else url.searchParams.delete('q');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function rowSkus(row: HTMLTableRowElement): string[] {
  const values = new Set<string>();
  if (row.dataset.sku) values.add(row.dataset.sku);
  row.querySelectorAll<HTMLOptionElement>('select[data-format-select] option[value]').forEach((option) => values.add(option.value));
  return [...values];
}

function exactVariantForQuery(query: string): OfficialProductVariant | undefined {
  const normalized = normalizeSearchText(query);
  if (!normalized) return undefined;
  return OFFICIAL_PRODUCT_VARIANTS.find(
    (variant) => normalized === normalizeSearchText(variant.sku) || normalized === normalizeSearchText(variant.barcode),
  );
}

function updateResultCount(visible: number, rowCount: number): void {
  const result = document.getElementById('catalogue-result');
  if (!result) return;
  const current = result.textContent ?? '';
  const match = current.match(/^\s*\d+\s*\/\s*(\d+)\s*(.*)$/);
  const denominator = match?.[1] ? Number.parseInt(match[1], 10) : rowCount;
  const suffix = match?.[2]?.trim() || 'products';
  result.textContent = `${visible} / ${Number.isFinite(denominator) ? denominator : rowCount} ${suffix}`;
}

function applyUniversalSearch(query: string): void {
  const rowsElement = document.getElementById('product-rows');
  const table = document.getElementById('catalogue-table') as HTMLTableElement | null;
  const empty = document.getElementById('empty-state');
  if (!rowsElement || !table || !empty) return;

  const rows = [...rowsElement.querySelectorAll<HTMLTableRowElement>('tr[data-sku], tr[data-product-family]')];

  if (!query.trim()) {
    rows.forEach((row) => {
      row.hidden = false;
      delete row.dataset.searchScore;
    });
    table.hidden = rows.length === 0;
    empty.hidden = rows.length !== 0;
    updateResultCount(rows.length, rows.length);
    return;
  }

  const scoreBySku = new Map(searchOfficialProducts(query).map((hit) => [hit.sku, hit.score]));
  let visible = 0;

  for (const row of rows) {
    const score = Math.max(0, ...rowSkus(row).map((sku) => scoreBySku.get(sku) ?? 0));
    row.hidden = score <= 0;
    if (score > 0) {
      row.dataset.searchScore = String(score);
      visible += 1;
    } else {
      delete row.dataset.searchScore;
    }
  }

  table.hidden = visible === 0;
  empty.hidden = visible !== 0;
  updateResultCount(visible, rows.length);

  const exact = exactVariantForQuery(query);
  if (!exact) return;

  const selector = [...rowsElement.querySelectorAll<HTMLSelectElement>('select[data-format-select]')].find((candidate) =>
    [...candidate.options].some((option) => option.value === exact.sku),
  );
  if (selector && selector.value !== exact.sku) {
    selector.value = exact.sku;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function scheduleApply(): void {
  window.cancelAnimationFrame(scheduledFrame);
  scheduledFrame = window.requestAnimationFrame(() => {
    scheduledFrame = window.requestAnimationFrame(() => applyUniversalSearch(currentQuery));
  });
}

function setUniversalQuery(query: string): void {
  currentQuery = query;
  restoreQueryInUrl(query);
  scheduleApply();
  window.dispatchEvent(
    new CustomEvent('hot:universal-search-input', {
      detail: { queryLength: query.trim().length },
    }),
  );
}

const initialUrl = new URL(window.location.href);
const initialQuery = initialUrl.searchParams.get('q')?.trim() || '';
if (initialQuery) {
  currentQuery = initialQuery;
  initialUrl.searchParams.delete('q');
  window.history.replaceState(null, '', `${initialUrl.pathname}${initialUrl.search}${initialUrl.hash}`);
}

// This controller is loaded before preview.ts. Stop the legacy English-only input
// handler from deleting the catalogue rows, then apply multilingual matching to
// the already verified/grouped catalogue instead.
document.addEventListener(
  'input',
  (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'catalogue-search') return;
    event.stopImmediatePropagation();
    setUniversalQuery(input.value);
  },
  true,
);

document.addEventListener(
  'click',
  (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('#reset-filters')) return;
    currentQuery = '';
    restoreQueryInUrl('');
    scheduleApply();
  },
  true,
);

const rowsElement = document.getElementById('product-rows');
if (rowsElement) {
  const observer = new MutationObserver(() => {
    const input = document.getElementById('catalogue-search');
    if (input instanceof HTMLInputElement && input.value !== currentQuery) input.value = currentQuery;
    if (currentQuery.trim()) restoreQueryInUrl(currentQuery);
    scheduleApply();
  });
  observer.observe(rowsElement, { childList: true });
}

if (initialQuery) {
  const input = document.getElementById('catalogue-search');
  if (input instanceof HTMLInputElement) input.value = initialQuery;
  restoreQueryInUrl(initialQuery);
  scheduleApply();
}
