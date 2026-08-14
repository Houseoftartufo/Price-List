import './styles/official-standby.css';
import { findRemasteredOfficialVariant } from './official-product-remaster';

const QUOTE_KEY = 'hot-price-list:quote:v1';
let scheduled = false;

function compact(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function locale(): 'en' | 'it' | 'fr' | 'nl' {
  const value = document.documentElement.lang.toLowerCase();
  if (value.startsWith('it')) return 'it';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('nl')) return 'nl';
  return 'en';
}

const copy = {
  en: { standby: 'Standby', pending: 'Pending', price: 'Price pending', pack: 'Case pack pending' },
  it: { standby: 'Standby', pending: 'In attesa', price: 'Prezzo in attesa', pack: 'Pezzi / scatola in attesa' },
  fr: { standby: 'Standby', pending: 'En attente', price: 'Prix en attente', pack: 'Carton en attente' },
  nl: { standby: 'Standby', pending: 'In afwachting', price: 'Prijs in afwachting', pack: 'Doosinhoud in afwachting' },
} as const;

function parseVisibleMoney(value: string): number | undefined {
  const match = value.match(/[€]\s*([0-9.,]+)/);
  if (!match?.[1]) return undefined;
  const normalized = match[1].replaceAll('.', '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowInfo(row: HTMLTableRowElement): { name: string; size: string } | undefined {
  const name = compact(row.querySelector('.product-name')?.textContent);
  const cells = row.querySelectorAll('td');
  const size = compact(cells[1]?.textContent);
  if (!name || !size) return undefined;
  return { name, size };
}

function removeStandbyFromQuote(sku: string): void {
  const remove = document.querySelector<HTMLButtonElement>(`[data-remove-quote="${CSS.escape(sku)}"]`);
  if (remove) {
    remove.click();
    return;
  }

  // Defensive cleanup for a stale persisted quote before the quote DOM exists.
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const cleaned = parsed.filter((item) => {
      if (!Array.isArray(item) || item.length < 1) return true;
      return String(item[0]) !== sku;
    });
    if (cleaned.length !== parsed.length) window.localStorage.setItem(QUOTE_KEY, JSON.stringify(cleaned));
  } catch {
    // Storage is best-effort only; the capture guards below still prevent new standby orders.
  }
}

function decorateRow(row: HTMLTableRowElement): void {
  const info = rowInfo(row);
  if (!info) return;
  const official = findRemasteredOfficialVariant(info.name, info.size);
  if (!official) {
    row.dataset.officialMaster = 'none';
    return;
  }

  row.dataset.officialMaster = 'matched';
  row.dataset.officialKey = official.officialKey;

  const cells = row.querySelectorAll<HTMLElement>('td');
  const basePrice = parseVisibleMoney(cells[3]?.textContent ?? '');
  const pricePending = basePrice === 0 || basePrice === undefined;
  const packPending = official.packStatus !== 'resolved' || !official.unitsPerCase;
  const standby = pricePending || packPending;
  row.dataset.orderStatus = standby ? 'standby' : 'orderable';
  row.dataset.priceStatus = pricePending ? 'pending' : 'ready';
  row.dataset.packStatus = packPending ? 'pending' : 'ready';

  const badge = row.querySelector<HTMLElement>('.sku-badge');
  if (badge) {
    const catalogueCode = compact(row.dataset.sku);
    if (official.sku) {
      badge.textContent = official.sku;
      badge.title = 'SKU';
      badge.dataset.officialSku = 'true';
    } else if (catalogueCode.startsWith('MASTER-')) {
      badge.textContent = copy[locale()].pending;
      badge.title = 'SKU pending';
      badge.dataset.officialSku = 'pending';
    } else {
      badge.textContent = catalogueCode;
      badge.title = 'Catalogue code';
      badge.dataset.officialSku = 'pending';
    }
  }

  if (!standby) return;
  const t = copy[locale()];

  if (packPending && cells[2]) cells[2].innerHTML = `<span class="standby-value">${t.pack}</span>`;
  if (pricePending && cells[3]) cells[3].innerHTML = `<span class="standby-value">${t.price}</span>`;
  if (cells[4]) cells[4].innerHTML = '<span class="standby-value">—</span>';
  if (cells[5]) cells[5].innerHTML = `<span class="standby-pill">${t.standby}</span>`;
  if (cells[6]) cells[6].innerHTML = `<div class="dynamic-price standby-price"><strong>—</strong><small>${t.pending}</small></div>`;
  if (cells[7]) cells[7].innerHTML = `<div class="row-subtotal">—</div><button class="add-button standby-button" type="button" disabled aria-disabled="true">${t.standby}</button>`;

  const sku = row.dataset.sku;
  if (sku) removeStandbyFromQuote(sku);
}

function decorateAll(): void {
  document.querySelectorAll<HTMLTableRowElement>('#product-rows tr[data-sku]').forEach(decorateRow);
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    decorateAll();
  });
}

// Capture-phase protection: the existing buyer handlers never receive a standby order action.
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLTableRowElement>('#product-rows tr[data-order-status="standby"]');
  if (!row) return;
  if (target.closest('[data-add-quote], [data-qty-action], [data-qty-input]')) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

document.addEventListener('change', (event) => {
  const target = event.target as HTMLElement;
  const row = target.closest<HTMLTableRowElement>('#product-rows tr[data-order-status="standby"]');
  if (!row || !target.closest('[data-qty-input]')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

const observer = new MutationObserver(schedule);
const rows = document.getElementById('product-rows');
if (rows) observer.observe(rows, { childList: true, subtree: true });
document.addEventListener('click', schedule);
document.addEventListener('keydown', schedule);
schedule();

export {};
