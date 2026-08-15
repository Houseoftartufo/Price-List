import './styles/product-detail-quote-cta.css';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const fallbackCopy = {
  en: { add: 'Add to quote' },
  it: { add: 'Aggiungi al preventivo' },
  fr: { add: 'Ajouter au devis' },
  nl: { add: 'Toevoegen aan offerte' },
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

function detailDialog(): HTMLDialogElement | null {
  return document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
}

function rowForSku(sku: string): HTMLTableRowElement | null {
  return document.querySelector<HTMLTableRowElement>(`#product-rows tr[data-sku="${CSS.escape(sku)}"]`);
}

function sourceQuoteButton(sku: string): HTMLButtonElement | null {
  return rowForSku(sku)?.querySelector<HTMLButtonElement>('[data-add-quote]') ?? null;
}

function ensureQuoteAction(dialog: HTMLDialogElement): HTMLButtonElement | undefined {
  if (!dialog.open) return undefined;
  const sku = dialog.dataset.sku?.trim();
  if (!sku) return undefined;

  let action = dialog.querySelector<HTMLElement>('.product-detail-quote-action');
  let button = action?.querySelector<HTMLButtonElement>('[data-product-detail-quote]');

  if (!action || !button || button.dataset.productDetailQuote !== sku) {
    action?.remove();
    action = document.createElement('div');
    action.className = 'product-detail-quote-action';

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-detail-quote-button';
    button.dataset.productDetailQuote = sku;
    action.append(button);

    const specs = dialog.querySelector<HTMLElement>('.product-detail-specs');
    if (specs) specs.insertAdjacentElement('afterend', action);
    else dialog.querySelector<HTMLElement>('.product-detail-content')?.prepend(action);
  }

  const source = sourceQuoteButton(sku);
  const row = rowForSku(sku);
  const inQuote = source?.dataset.inQuote === 'true' || row?.dataset.inQuote === 'true';
  const label = compact(source?.textContent) || fallbackCopy[locale()].add;

  // Avoid creating a new text node on every MutationObserver pass.
  // Rewriting textContent would itself emit a childList mutation and could
  // keep the observer busy indefinitely while the product dialog is open.
  if (compact(button.textContent) !== label) button.textContent = label;
  button.disabled = !source || source.disabled;
  button.dataset.inQuote = String(inQuote);
  button.setAttribute('aria-pressed', String(inQuote));
  button.setAttribute('aria-label', label);

  return button;
}

function syncActiveDialog(): void {
  const dialog = detailDialog();
  if (dialog?.open) ensureQuoteAction(dialog);
}

const observer = new MutationObserver(syncActiveDialog);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['open', 'data-sku'],
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const detailButton = target.closest<HTMLButtonElement>('[data-product-detail-quote]');

  if (detailButton) {
    event.preventDefault();
    const sku = detailButton.dataset.productDetailQuote?.trim();
    if (!sku) return;

    const source = sourceQuoteButton(sku);
    if (!source || source.disabled) return;

    // Delegate to the catalogue's existing quote button so quantity, pricing,
    // persistence, analytics and quote rendering stay owned by one flow.
    source.click();
    window.setTimeout(syncActiveDialog, 0);
    return;
  }

  if (target.closest('[data-add-quote], [data-remove-quote], #clear-quote')) {
    window.setTimeout(syncActiveDialog, 0);
  }
});

export {};
