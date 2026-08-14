import './styles/official-standby.css';
import { findRemasteredOfficialVariant } from './official-product-remaster';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const PRICE_PENDING_KEYS = new Set([
  'truffle cashew|80g',
  'truffle almonds|80g',
  'truffle walnuts|80g',
  'acacia honey with truffle|450g',
]);

const copy = {
  en: { standby: 'Standby', price: 'Price to confirm', pack: 'Case pack to confirm', pending: 'Commercial data pending' },
  it: { standby: 'Standby', price: 'Prezzo da confermare', pack: 'Pz/scatola da confermare', pending: 'Dati commerciali da completare' },
  fr: { standby: 'En attente', price: 'Prix à confirmer', pack: 'Colisage à confirmer', pending: 'Données commerciales à compléter' },
  nl: { standby: 'In afwachting', price: 'Prijs te bevestigen', pack: 'Doosinhoud te bevestigen', pending: 'Commerciële gegevens aan te vullen' },
} as const;

function locale(): Locale {
  const value = document.documentElement.lang.toLowerCase();
  if (value.startsWith('it')) return 'it';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('nl')) return 'nl';
  return 'en';
}

function compact(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function rowOfficialKey(row: HTMLTableRowElement): string | undefined {
  const name = compact(row.querySelector('.product-name')?.textContent);
  const size = compact(row.querySelectorAll('td')[1]?.textContent);
  if (!name || !size) return undefined;
  return findRemasteredOfficialVariant(name, size)?.officialKey;
}

function applyStandbyRow(row: HTMLTableRowElement): void {
  const name = compact(row.querySelector('.product-name')?.textContent);
  const size = compact(row.querySelectorAll('td')[1]?.textContent);
  if (!name || !size) return;
  const official = findRemasteredOfficialVariant(name, size);
  if (!official) return;

  const pricePending = PRICE_PENDING_KEYS.has(official.officialKey);
  const packPending = official.packStatus !== 'resolved';
  if (!pricePending && !packPending) {
    delete row.dataset.officialStandby;
    return;
  }

  row.dataset.officialStandby = 'true';
  const t = copy[locale()];
  const cells = row.querySelectorAll<HTMLTableCellElement>('td');

  const badge = row.querySelector<HTMLElement>('.sku-badge');
  if (badge && row.dataset.sku?.startsWith('MASTER-')) {
    badge.textContent = t.standby;
    badge.dataset.standbyBadge = 'true';
  }

  if (packPending && cells[2]) {
    cells[2].innerHTML = `<strong class="standby-value">—</strong><small class="standby-note">${t.pack}</small>`;
  }

  if (pricePending && cells[3]) {
    cells[3].innerHTML = `<strong class="standby-value">—</strong><small class="standby-note">${t.price}</small>`;
  } else if (packPending) {
    cells[3]?.querySelector('.product-meta')?.replaceChildren(document.createTextNode(t.pack));
  }

  if (pricePending && cells[4]) {
    cells[4].innerHTML = `<strong class="standby-value">—</strong><small class="standby-note">${t.price}</small>`;
  }

  const quantity = cells[5];
  quantity?.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  });
  const input = quantity?.querySelector<HTMLInputElement>('input');
  if (input) {
    input.disabled = true;
    input.setAttribute('aria-disabled', 'true');
  }

  if (cells[6]) {
    cells[6].innerHTML = `<div class="dynamic-price standby-state"><strong>${t.standby}</strong><small>${pricePending ? t.price : t.pack}</small></div>`;
  }

  if (cells[7]) {
    const subtotal = cells[7].querySelector<HTMLElement>('.row-subtotal');
    if (subtotal) subtotal.textContent = '—';
    const add = cells[7].querySelector<HTMLButtonElement>('[data-add-quote]');
    if (add) {
      add.disabled = true;
      add.setAttribute('aria-disabled', 'true');
      add.textContent = t.standby;
      add.title = t.pending;
    }
  }
}

function applyAll(): void {
  document.querySelectorAll<HTMLTableRowElement>('#product-rows tr[data-sku]').forEach(applyStandbyRow);
}

function clearPersistedStandbyQuoteRows(): void {
  try {
    const key = 'hot-price-list:quote:v1';
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<[string, number]>;
    // Old catalogue codes that now correspond to official variants with a missing case pack.
    const blockedLegacyCodes = new Set(['43', '52', '54', '63']);
    const safe = parsed.filter(([code]) => !blockedLegacyCodes.has(code));
    if (safe.length !== parsed.length) window.localStorage.setItem(key, JSON.stringify(safe));
  } catch {
    // Local storage is an optional enhancement; never block the catalogue.
  }
}

const rows = document.getElementById('product-rows');
if (rows) {
  rows.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLTableRowElement>('tr[data-official-standby="true"]');
    if (!row || target.closest('.product-cell')) return;
    if (target.closest('[data-add-quote], [data-qty-action], [data-qty-input]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new MutationObserver(applyAll);
  observer.observe(rows, { childList: true, subtree: true });
}

document.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('[data-locale]')) queueMicrotask(applyAll);
});

clearPersistedStandbyQuoteRows();
applyAll();

export { PRICE_PENDING_KEYS, rowOfficialKey };
