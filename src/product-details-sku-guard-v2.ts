import './styles/product-details-guard.css';
import { VERIFIED_PRODUCT_DETAIL_MAP, type VerifiedProductDetailMapping } from './product-detail-map';

type Locale = 'en' | 'it' | 'fr' | 'nl';

interface ShopifyVariant {
  sku?: string | null;
}

interface ShopifyProduct {
  variants?: ShopifyVariant[];
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const productCache = new Map<string, Promise<ShopifyProduct | undefined>>();
let auditTimer: number | undefined;
let auditGeneration = 0;

const labels = {
  en: {
    catalogueCode: 'Catalogue code',
    siteSku: 'Site SKU',
    noExactMatch: 'No exact public Shopify variant matches this wholesale format. To avoid showing the wrong SKU, photo or ingredients, only the verified catalogue specifications are displayed.',
  },
  it: {
    catalogueCode: 'Codice catalogo',
    siteSku: 'SKU sito',
    noExactMatch: 'Nessuna variante Shopify pubblica corrisponde esattamente a questo formato wholesale. Per evitare SKU, foto o ingredienti sbagliati, mostriamo solo le specifiche verificate del listino.',
  },
  fr: {
    catalogueCode: 'Code catalogue',
    siteSku: 'SKU du site',
    noExactMatch: 'Aucune variante Shopify publique ne correspond exactement à ce format wholesale. Afin d’éviter un SKU, une photo ou des ingrédients incorrects, seules les spécifications vérifiées du catalogue sont affichées.',
  },
  nl: {
    catalogueCode: 'Cataloguscode',
    siteSku: 'Website-SKU',
    noExactMatch: 'Geen openbare Shopify-variant komt exact overeen met dit groothandelsformaat. Om een verkeerd SKU, foto of ingrediënten te vermijden, worden alleen de geverifieerde catalogusspecificaties getoond.',
  },
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

function localePrefix(current: Locale): string {
  return current === 'en' ? '' : `/${current}`;
}

function productUrl(handle: string, current: Locale): string {
  return `${SHOP_ORIGIN}${localePrefix(current)}/products/${handle}`;
}

async function fetchProduct(handle: string, current: Locale): Promise<ShopifyProduct | undefined> {
  const key = `${current}:${handle}`;
  const cached = productCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const urls = [
      `${productUrl(handle, current)}.js`,
      ...(current === 'en' ? [] : [`${SHOP_ORIGIN}/products/${handle}.js`]),
    ];
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (response.ok) return (await response.json()) as ShopifyProduct;
      } catch (error) {
        console.warn('[HOT Price List] Exact Shopify SKU source unavailable.', { url, error });
      }
    }
    return undefined;
  })();

  productCache.set(key, request);
  return request;
}

function currentDialog(): HTMLDialogElement | null {
  return document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
}

function currentCode(dialog: HTMLDialogElement): string | undefined {
  return dialog.dataset.sku?.trim() || undefined;
}

function firstSpec(dialog: HTMLDialogElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>('.product-detail-specs .product-detail-spec');
}

function ensureCatalogueCode(dialog: HTMLDialogElement, code: string): void {
  const spec = firstSpec(dialog);
  if (!spec) return;
  const label = spec.querySelector<HTMLElement>('span:not([data-site-sku-label])');
  const value = spec.querySelector<HTMLElement>('strong:not([data-site-sku])');
  const expected = labels[locale()].catalogueCode;
  if (label && label.textContent !== expected) label.textContent = expected;
  if (value && value.textContent !== code) value.textContent = code;
}

function ensureSiteSku(dialog: HTMLDialogElement, sku: string): void {
  const spec = firstSpec(dialog);
  if (!spec) return;
  const existingLabel = spec.querySelector<HTMLElement>('[data-site-sku-label]');
  const existingValue = spec.querySelector<HTMLElement>('[data-site-sku]');
  const expectedLabel = labels[locale()].siteSku;

  if (existingLabel && existingValue) {
    if (existingLabel.textContent !== expectedLabel) existingLabel.textContent = expectedLabel;
    if (existingValue.textContent !== sku) existingValue.textContent = sku;
    return;
  }

  existingLabel?.remove();
  existingValue?.remove();
  const label = document.createElement('span');
  label.dataset.siteSkuLabel = 'true';
  label.style.marginTop = '8px';
  label.textContent = expectedLabel;
  const value = document.createElement('strong');
  value.dataset.siteSku = 'true';
  value.textContent = sku;
  spec.append(label, value);
}

function removeSiteSku(dialog: HTMLDialogElement): void {
  dialog.querySelector('[data-site-sku-label]')?.remove();
  dialog.querySelector('[data-site-sku]')?.remove();
}

function isScrubbed(dialog: HTMLDialogElement, code: string): boolean {
  const sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  return dialog.dataset.shopifyMatch === 'none'
    && !dialog.querySelector('[data-site-sku]')
    && !dialog.querySelector('.product-detail-source')
    && !dialog.querySelector('[data-product-detail-main-image]')
    && sections?.dataset.skuGuardKey === code
    && sections.dataset.skuGuard === 'unmatched';
}

function scrubRemoteContent(dialog: HTMLDialogElement, code: string): void {
  ensureCatalogueCode(dialog, code);
  removeSiteSku(dialog);
  const text = labels[locale()].noExactMatch;

  const loading = dialog.querySelector<HTMLElement>('.product-detail-loading');
  if (loading) {
    loading.className = 'product-detail-note';
    if (loading.textContent !== text) loading.textContent = text;
  }

  let sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (!sections) {
    const content = dialog.querySelector<HTMLElement>('.product-detail-content');
    if (content) {
      sections = document.createElement('div');
      sections.className = 'product-detail-sections';
      const source = dialog.querySelector('.product-detail-source');
      if (source) content.insertBefore(sections, source);
      else content.append(sections);
    }
  }

  if (sections && (sections.dataset.skuGuardKey !== code || sections.dataset.skuGuard !== 'unmatched')) {
    sections.dataset.skuGuard = 'unmatched';
    sections.dataset.skuGuardKey = code;
    sections.innerHTML = '';
    const note = document.createElement('p');
    note.className = 'product-detail-note';
    note.textContent = text;
    sections.append(note);
  }

  dialog.querySelector('.product-detail-source')?.remove();
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (media && (media.querySelector('img') || !media.querySelector('.product-detail-image-stage[data-empty="true"]'))) {
    media.innerHTML = '<div class="product-detail-image-stage" data-empty="true"></div>';
  }
  dialog.dataset.shopifyMatch = 'none';
}

function sourceMatches(dialog: HTMLDialogElement, mapping: VerifiedProductDetailMapping): boolean {
  const source = dialog.querySelector<HTMLAnchorElement>('.product-detail-source');
  if (!source) return true;
  try {
    return new URL(source.href).pathname.includes(`/products/${mapping.handle}`);
  } catch {
    return false;
  }
}

async function auditDialog(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;
  const code = currentCode(dialog);
  if (!code) return;
  ensureCatalogueCode(dialog, code);

  const mapping = VERIFIED_PRODUCT_DETAIL_MAP[code];
  if (!mapping) {
    if (!isScrubbed(dialog, code)) scrubRemoteContent(dialog, code);
    return;
  }

  const existingSku = compact(dialog.querySelector<HTMLElement>('[data-site-sku]')?.textContent);
  if (dialog.dataset.shopifyMatch === 'verified' && existingSku === mapping.siteSku && sourceMatches(dialog, mapping)) {
    return;
  }

  const generation = ++auditGeneration;
  dialog.dataset.shopifyMatch = 'pending';
  const product = await fetchProduct(mapping.handle, locale());
  if (generation !== auditGeneration || !dialog.open || currentCode(dialog) !== code) return;

  const matches = (product?.variants ?? []).filter((variant) => compact(variant.sku) === mapping.siteSku);
  if (matches.length !== 1 || !sourceMatches(dialog, mapping)) {
    scrubRemoteContent(dialog, code);
    dialog.dataset.shopifyMatch = matches.length === 1 ? 'source-mismatch' : 'variant-mismatch';
    return;
  }

  ensureCatalogueCode(dialog, code);
  ensureSiteSku(dialog, mapping.siteSku);
  dialog.dataset.shopifyMatch = 'verified';
}

function scheduleAudit(): void {
  window.clearTimeout(auditTimer);
  auditTimer = window.setTimeout(() => {
    const dialog = currentDialog();
    if (dialog?.open) void auditDialog(dialog);
  }, 0);
}

const observer = new MutationObserver(() => scheduleAudit());
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
document.addEventListener('click', scheduleAudit);
document.addEventListener('keydown', scheduleAudit);

export {};
