import './styles/product-format-groups.css';

import { OFFICIAL_MASTER_COUNTS, OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';

export interface ProductFormatVariant {
  product: string;
  size: string;
  sku: string;
}

export interface ProductFormatFamily {
  product: string;
  variants: ProductFormatVariant[];
}

function formatSortValue(label: string): number {
  const match = label.trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)?$/);
  if (!match?.[1]) return Number.MAX_SAFE_INTEGER;
  const value = Number.parseFloat(match[1]);
  const unit = match[2] ?? '';
  if (unit === 'kg' || unit === 'l') return value * 1000;
  if (unit === 'cl') return value * 10;
  return value;
}

export function formatDisplayLabel(label: string): string {
  const match = label.trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(ml|g)$/);
  if (!match?.[1] || !match[2]) return label;
  const value = Number.parseFloat(match[1]);
  if (value >= 1000 && value % 1000 === 0) {
    const converted = value / 1000;
    return match[2] === 'ml' ? `${converted}L` : `${converted}kg`;
  }
  return label;
}

export function buildProductFormatFamilies(): ProductFormatFamily[] {
  const grouped = new Map<string, ProductFormatVariant[]>();
  for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
    const variants = grouped.get(entry.product) ?? [];
    variants.push({ product: entry.product, size: entry.size, sku: entry.sku });
    grouped.set(entry.product, variants);
  }
  return [...grouped.entries()].map(([product, variants]) => ({
    product,
    variants: [...variants].sort((a, b) => formatSortValue(a.size) - formatSortValue(b.size)),
  }));
}

const families = buildProductFormatFamilies();
const familyBySku = new Map<string, ProductFormatFamily>();
for (const family of families) {
  for (const variant of family.variants) familyBySku.set(variant.sku, family);
}

const selectedSkuByFamily = new Map<string, string>();
const rawRowHtmlBySku = new Map<string, string>();
let observer: MutationObserver | undefined;
let scheduled = false;

function localeFormatLabel(): string {
  const lang = document.documentElement.lang.toLowerCase();
  if (lang.startsWith('it')) return 'Formato';
  if (lang.startsWith('nl')) return 'Formaat';
  return 'Format';
}

function rowFromHtml(html: string): HTMLTableRowElement | undefined {
  const template = document.createElement('template');
  template.innerHTML = `<table><tbody>${html.trim()}</tbody></table>`;
  const row = template.content.querySelector('tr');
  return row instanceof HTMLTableRowElement ? row : undefined;
}

function decorateRow(row: HTMLTableRowElement, family: ProductFormatFamily): void {
  const sku = row.dataset.sku;
  if (!sku) return;
  row.dataset.productFamily = family.product;
  row.dataset.formatGrouped = 'true';

  const cells = row.querySelectorAll<HTMLTableCellElement>('td');
  const sizeCell = cells[1];
  if (!sizeCell || family.variants.length < 2) return;

  const label = localeFormatLabel();
  sizeCell.innerHTML = `
    <label class="product-format-selector" title="${label}">
      <span class="sr-only">${label}</span>
      <select data-format-select data-product-family="${family.product.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" aria-label="${label}">
        ${family.variants
          .map(
            (variant) =>
              `<option value="${variant.sku}"${variant.sku === sku ? ' selected' : ''}>${formatDisplayLabel(variant.size)}</option>`,
          )
          .join('')}
      </select>
    </label>`;
}

function updateFamilyCounters(visibleFamilies: number): void {
  const metric = document.getElementById('metric-products');
  if (metric) metric.textContent = String(OFFICIAL_MASTER_COUNTS.families);

  const result = document.getElementById('catalogue-result');
  if (!result?.textContent) return;
  const suffix = result.textContent.replace(/^\s*\d+\s*\/\s*\d+\s*/, '');
  result.textContent = `${visibleFamilies} / ${OFFICIAL_MASTER_COUNTS.families} ${suffix}`.trim();
}

function collapseProductRows(): void {
  const rowsEl = document.getElementById('product-rows');
  if (!(rowsEl instanceof HTMLTableSectionElement)) return;

  const renderedRows = [...rowsEl.querySelectorAll<HTMLTableRowElement>(':scope > tr[data-sku]')];
  if (renderedRows.length === 0) return;

  observer?.disconnect();
  try {
    const rowBySku = new Map<string, HTMLTableRowElement>();
    const familyOrder: string[] = [];
    const visibleSkusByFamily = new Map<string, string[]>();
    const passthrough: HTMLTableRowElement[] = [];

    for (const row of renderedRows) {
      const sku = row.dataset.sku;
      if (!sku) continue;
      if (row.dataset.formatGrouped !== 'true') rawRowHtmlBySku.set(sku, row.outerHTML);
      rowBySku.set(sku, row);

      const family = familyBySku.get(sku);
      if (!family) {
        passthrough.push(row);
        continue;
      }
      if (!visibleSkusByFamily.has(family.product)) familyOrder.push(family.product);
      const visible = visibleSkusByFamily.get(family.product) ?? [];
      visible.push(sku);
      visibleSkusByFamily.set(family.product, visible);
    }

    const fragment = document.createDocumentFragment();
    for (const product of familyOrder) {
      const family = families.find((entry) => entry.product === product);
      const visibleSkus = visibleSkusByFamily.get(product) ?? [];
      if (!family || visibleSkus.length === 0) continue;

      const preferred = selectedSkuByFamily.get(product);
      const selectedSku = preferred && visibleSkus.includes(preferred) ? preferred : visibleSkus[0];
      if (!selectedSku) continue;
      selectedSkuByFamily.set(product, selectedSku);

      const row = rowBySku.get(selectedSku);
      if (!row) continue;
      decorateRow(row, family);
      fragment.append(row);
    }

    for (const row of passthrough) fragment.append(row);
    rowsEl.replaceChildren(fragment);
    updateFamilyCounters(familyOrder.length + passthrough.length);
  } finally {
    observer?.observe(rowsEl, { childList: true });
  }
}

function scheduleCollapse(): void {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    collapseProductRows();
  });
}

function selectFormat(select: HTMLSelectElement): void {
  const sku = select.value;
  const family = familyBySku.get(sku);
  if (!family) return;
  selectedSkuByFamily.set(family.product, sku);

  const currentRow = select.closest<HTMLTableRowElement>('tr[data-sku]');
  const cached = rawRowHtmlBySku.get(sku);
  if (currentRow && cached) {
    const replacement = rowFromHtml(cached);
    if (replacement) {
      observer?.disconnect();
      decorateRow(replacement, family);
      currentRow.replaceWith(replacement);
      const rowsEl = document.getElementById('product-rows');
      if (rowsEl instanceof HTMLTableSectionElement) observer?.observe(rowsEl, { childList: true });
      window.dispatchEvent(new CustomEvent('hot:product-format-change', { detail: { product: family.product, sku } }));
      return;
    }
  }

  // Deep links/searches may initially render just one SKU. Expanding the search
  // to the product family makes every official format available without losing data.
  const search = document.getElementById('catalogue-search');
  if (search instanceof HTMLInputElement) {
    search.value = family.product;
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function initialiseFormatGrouping(): void {
  const rowsEl = document.getElementById('product-rows');
  if (!(rowsEl instanceof HTMLTableSectionElement)) return;

  const directSku = new URLSearchParams(window.location.search).get('sku')?.trim();
  if (directSku) {
    const family = familyBySku.get(directSku);
    if (family) selectedSkuByFamily.set(family.product, directSku);
  }

  rowsEl.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.matches('[data-format-select]')) {
      event.stopPropagation();
      selectFormat(target);
    }
  });

  rowsEl.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-format-select]')) event.stopPropagation();
  });

  observer = new MutationObserver(scheduleCollapse);
  observer.observe(rowsEl, { childList: true });
  scheduleCollapse();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseFormatGrouping, { once: true });
  } else {
    initialiseFormatGrouping();
  }
}
