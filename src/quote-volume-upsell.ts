import './styles/quote-volume-upsell.css';

import { DEFAULT_DISCOUNT_POLICY } from './catalog/pricing';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const QUOTE_KEY = 'hot-price-list:quote:v1';

const COPY = {
  en: {
    boxes: 'Boxes',
    add: (count: number) => `Add ${count} ${count === 1 ? 'box' : 'boxes'}`,
    unlock: (discount: number) => `Unlock −${discount}%`,
    best: 'Best volume price unlocked',
    increase: 'Increase boxes',
    decrease: 'Decrease boxes',
    jump: (count: number, discount: number) => `Add ${count} ${count === 1 ? 'box' : 'boxes'} to unlock −${discount}%`,
  },
  it: {
    boxes: 'Box',
    add: (count: number) => `Aggiungi ${count} box`,
    unlock: (discount: number) => `Sblocca −${discount}%`,
    best: 'Migliore fascia volume raggiunta',
    increase: 'Aumenta box',
    decrease: 'Diminuisci box',
    jump: (count: number, discount: number) => `Aggiungi ${count} box per sbloccare −${discount}%`,
  },
  fr: {
    boxes: 'Box',
    add: (count: number) => `Ajoutez ${count} box`,
    unlock: (discount: number) => `Débloquez −${discount}%`,
    best: 'Meilleur tarif volume débloqué',
    increase: 'Augmenter les box',
    decrease: 'Réduire les box',
    jump: (count: number, discount: number) => `Ajoutez ${count} box pour débloquer −${discount}%`,
  },
  nl: {
    boxes: 'Boxen',
    add: (count: number) => `Voeg ${count} ${count === 1 ? 'box' : 'boxen'} toe`,
    unlock: (discount: number) => `Ontgrendel −${discount}%`,
    best: 'Beste volumetarief ontgrendeld',
    increase: 'Meer boxen',
    decrease: 'Minder boxen',
    jump: (count: number, discount: number) => `Voeg ${count} ${count === 1 ? 'box' : 'boxen'} toe voor −${discount}%`,
  },
} as const;

function locale(): Locale {
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

function nextTier(quantity: number) {
  return DEFAULT_DISCOUNT_POLICY.find((tier) => tier.minCases > quantity);
}

function activeDiscount(quantity: number): number {
  return [...DEFAULT_DISCOUNT_POLICY]
    .filter((tier) => tier.minCases <= quantity)
    .sort((left, right) => right.minCases - left.minCases)[0]?.discountRate ?? 0;
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

function quoteQuantity(sku: string, line: HTMLElement): number {
  const stored = readQuote().get(sku);
  if (stored) return stored;
  const rendered = Number.parseInt(line.querySelector<HTMLOutputElement>('[data-quote-qty-value]')?.value ?? '', 10);
  return Number.isInteger(rendered) && rendered > 0 ? rendered : 1;
}

function tierMarkup(quantity: number): string {
  const t = COPY[locale()];
  const next = nextTier(quantity);
  if (!next) {
    return `<div class="quote-tier-card" data-best="true" role="status">
      <span>${t.best}</span>
      <strong>−${Math.round(activeDiscount(quantity) * 100)}%</strong>
    </div>`;
  }

  const add = next.minCases - quantity;
  const discount = Math.round(next.discountRate * 100);
  return `<button class="quote-tier-card" type="button" data-quote-tier-target="${next.minCases}" aria-label="${t.jump(add, discount)}">
    <span>${t.add(add)}</span>
    <strong>${t.unlock(discount)}</strong>
    <i aria-hidden="true">→</i>
  </button>`;
}

function enhanceQuoteLine(line: HTMLElement): void {
  const remove = line.querySelector<HTMLButtonElement>('[data-remove-quote]');
  const sku = remove?.dataset.removeQuote;
  if (!sku) return;

  const existing = line.querySelector<HTMLElement>('[data-quote-volume-tools]');
  const quantity = quoteQuantity(sku, line);
  if (existing?.dataset.quantity === String(quantity) && existing.dataset.locale === locale()) return;
  existing?.remove();

  const meta = line.querySelector<HTMLElement>('.quote-line-meta');
  if (!meta?.parentElement) return;
  const t = COPY[locale()];
  const tools = document.createElement('div');
  tools.className = 'quote-volume-tools';
  tools.dataset.quoteVolumeTools = sku;
  tools.dataset.quantity = String(quantity);
  tools.dataset.locale = locale();
  tools.innerHTML = `
    <div class="quote-quantity-editor">
      <span>${t.boxes}</span>
      <div class="quote-quantity-control" aria-label="${t.boxes}">
        <button type="button" data-quote-qty-action="decrement" data-sku="${sku}" aria-label="${t.decrease}">−</button>
        <output data-quote-qty-value="${sku}" aria-live="polite">${quantity}</output>
        <button type="button" data-quote-qty-action="increment" data-sku="${sku}" aria-label="${t.increase}">+</button>
      </div>
    </div>
    ${tierMarkup(quantity)}
  `;
  meta.insertAdjacentElement('afterend', tools);
}

function enhanceQuote(): void {
  document.querySelectorAll<HTMLElement>('#quote-lines .quote-line').forEach(enhanceQuoteLine);
}

function enhanceCatalogueTier(hint: HTMLElement): void {
  if (hint.dataset.volumeUpsellEnhanced === 'true') return;
  const row = hint.closest<HTMLTableRowElement>('tr[data-sku]');
  const sku = row?.dataset.sku;
  const input = row?.querySelector<HTMLInputElement>('[data-qty-input]');
  if (!row || !sku || !input) return;

  const quantity = Number.parseInt(input.value, 10);
  if (!Number.isInteger(quantity) || quantity < 1) return;
  const t = COPY[locale()];
  const next = nextTier(quantity);

  if (!next) {
    hint.dataset.volumeUpsellEnhanced = 'true';
    hint.classList.add('tier-hint-best');
    hint.innerHTML = `<span>${t.best}</span><strong>−${Math.round(activeDiscount(quantity) * 100)}%</strong>`;
    return;
  }

  const add = next.minCases - quantity;
  const discount = Math.round(next.discountRate * 100);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tier-hint tier-hint-action';
  button.dataset.catalogueTierTarget = String(next.minCases);
  button.dataset.sku = sku;
  button.setAttribute('aria-label', t.jump(add, discount));
  button.innerHTML = `<span>${t.add(add)}</span><strong>${t.unlock(discount)}</strong><i aria-hidden="true">→</i>`;
  hint.replaceWith(button);
}

function enhanceCatalogue(): void {
  document.querySelectorAll<HTMLElement>('#product-rows .tier-hint:not(.tier-hint-action)').forEach(enhanceCatalogueTier);
}

let scheduled = false;
function scheduleEnhancement(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    enhanceQuote();
    enhanceCatalogue();
  });
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const quantityButton = target.closest<HTMLButtonElement>('[data-quote-qty-action]');
  if (quantityButton?.dataset.sku && quantityButton.dataset.quoteQtyAction) {
    const line = quantityButton.closest<HTMLElement>('.quote-line');
    if (!line) return;
    const current = quoteQuantity(quantityButton.dataset.sku, line);
    const next = quantityButton.dataset.quoteQtyAction === 'increment' ? current + 1 : Math.max(1, current - 1);
    proxyQuantityChange(quantityButton.dataset.sku, next);
    return;
  }

  const quoteTier = target.closest<HTMLButtonElement>('[data-quote-tier-target]');
  if (quoteTier) {
    const line = quoteTier.closest<HTMLElement>('.quote-line');
    const sku = line?.querySelector<HTMLButtonElement>('[data-remove-quote]')?.dataset.removeQuote;
    const quantity = Number.parseInt(quoteTier.dataset.quoteTierTarget ?? '', 10);
    if (sku && Number.isInteger(quantity)) proxyQuantityChange(sku, quantity);
    return;
  }

  const catalogueTier = target.closest<HTMLButtonElement>('[data-catalogue-tier-target]');
  if (catalogueTier?.dataset.sku) {
    const quantity = Number.parseInt(catalogueTier.dataset.catalogueTierTarget ?? '', 10);
    if (Number.isInteger(quantity)) proxyQuantityChange(catalogueTier.dataset.sku, quantity);
  }
});

const observer = new MutationObserver(scheduleEnhancement);
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('hot:catalogue-event', scheduleEnhancement);
document.addEventListener('change', scheduleEnhancement);
scheduleEnhancement();

export {};
