import './universal-product-search-controller';
import './product-details';
import './product-details-sku-guard-v2';
import './product-detail-quote-cta';
import './official-runtime-guard';
import './product-format-groups';

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function emit(event: string, payload: AnalyticsPayload = {}): void {
  const detail = {
    event,
    ...payload,
    path: window.location.pathname,
    timestamp: Date.now(),
  };

  window.dispatchEvent(new CustomEvent('hot:catalogue-event', { detail }));
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: `hot_${event}`, ...payload });
  }
}

function bind(): void {
  emit('catalogue_view');

  let searchTimer: number | undefined;
  window.addEventListener('hot:universal-search-input', (event) => {
    const detail = (event as CustomEvent<{ queryLength?: number }>).detail;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      emit('catalogue_search', { queryLength: detail?.queryLength ?? 0 });
    }, 350);
  });

  for (const id of ['line-filter', 'truffle-filter']) {
    const select = document.getElementById(id) as HTMLSelectElement | null;
    select?.addEventListener('change', () => emit('catalogue_filter', { filter: id, value: select.value }));
  }

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const category = target.closest<HTMLElement>('[data-category]')?.dataset.category;
    if (category) emit('catalogue_category', { category });

    const detailRow = target.closest<HTMLElement>('.product-cell[data-product-details-ready="true"]')?.closest<HTMLTableRowElement>('tr[data-sku]');
    if (detailRow?.dataset.sku) emit('product_detail_open', { sku: detailRow.dataset.sku });

    const quoteSku = target.closest<HTMLElement>('[data-add-quote]:not(:disabled)')?.dataset.addQuote;
    if (quoteSku) emit('quote_add_or_update', { sku: quoteSku });

    if (target.closest('#quote-trigger')) emit('quote_open');
    if (target.closest('#copy-order')) emit('quote_copy');
    if (target.closest('#whatsapp-order')) emit('quote_whatsapp');
    if (target.closest('#email-order')) emit('quote_email');
    if (target.closest('[data-remove-quote]')) emit('quote_remove');
    if (target.closest('#clear-quote')) emit('quote_clear');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}

export {};
