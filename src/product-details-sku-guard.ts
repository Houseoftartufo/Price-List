type Locale = 'en' | 'it' | 'fr' | 'nl';

interface RowInfo {
  catalogueCode: string;
  name: string;
  size: string;
}

interface SiteMapping {
  handle: string;
  requirePercent?: boolean;
}

interface ShopifyVariant {
  sku?: string | null;
  title?: string;
  public_title?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  options?: string[];
}

interface ShopifyProduct {
  variants?: ShopifyVariant[];
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const productCache = new Map<string, Promise<ShopifyProduct | undefined>>();
let auditSequence = 0;
let auditScheduled = false;

const copy = {
  en: {
    catalogueCode: 'Catalogue code',
    siteSku: 'Site SKU',
    noExactMatch: 'No exact Shopify variant match was found for this wholesale format. To avoid showing the wrong SKU, photo or ingredients, only the verified catalogue specifications are displayed.',
  },
  it: {
    catalogueCode: 'Codice catalogo',
    siteSku: 'SKU sito',
    noExactMatch: 'Non è stata trovata una variante Shopify esattamente corrispondente a questo formato wholesale. Per evitare SKU, foto o ingredienti sbagliati, mostriamo solo le specifiche verificate del listino.',
  },
  fr: {
    catalogueCode: 'Code catalogue',
    siteSku: 'SKU du site',
    noExactMatch: 'Aucune variante Shopify correspondant exactement à ce format wholesale n’a été trouvée. Afin d’éviter un SKU, une photo ou des ingrédients incorrects, seules les spécifications vérifiées du catalogue sont affichées.',
  },
  nl: {
    catalogueCode: 'Cataloguscode',
    siteSku: 'Website-SKU',
    noExactMatch: 'Er is geen Shopify-variant gevonden die exact overeenkomt met dit groothandelsformaat. Om een verkeerde SKU, foto of ingrediënten te vermijden, worden alleen de geverifieerde catalogusspecificaties getoond.',
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

function normalise(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function safeMapping(info: RowInfo): SiteMapping | undefined {
  const name = normalise(info.name);

  // Natural Line products are commercially distinct from the standard Shopify products.
  if (name.includes('natural line')) return undefined;

  if (name === 'summer truffle carpaccio' || name === 'summer truffle carpaccio with aroma') {
    return { handle: 'summer-truffle-carpaccio' };
  }

  if (name.includes('white truffled sauce') && name.includes('bianchetto truffle 2%')) {
    return { handle: 'white-truffle-sauce' };
  }

  if (name.includes('truffled sauce') && name.includes('summer truffle 5%')) {
    return { handle: 'black-truffle-sauce', requirePercent: true };
  }

  if (name.includes('truffled sauce') && name.includes('summer truffle 10%')) {
    return { handle: 'black-truffle-sauce', requirePercent: true };
  }

  if (name === 'white truffle extra virgin olive oil') {
    return { handle: 'parfumed-white-truffle-extra-virgin-olive-oil' };
  }

  if (name === 'black truffle extra virgin olive oil') {
    return { handle: 'black-truffle-extra-virgin-olive-oil' };
  }

  return undefined;
}

function rowInfo(dialog: HTMLDialogElement): RowInfo | undefined {
  const catalogueCode = dialog.dataset.sku?.trim();
  if (!catalogueCode) return undefined;
  const row = document.querySelector<HTMLTableRowElement>(`#product-rows tr[data-sku="${CSS.escape(catalogueCode)}"]`);
  if (!row) return undefined;
  const cells = row.querySelectorAll('td');
  const name = compact(row.querySelector('.product-name')?.textContent);
  const size = compact(cells[1]?.textContent);
  if (!name || !size) return undefined;
  return { catalogueCode, name, size };
}

function measureKey(value: string): string | undefined {
  const text = value.toLowerCase().replace(',', '.');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);
  if (!match?.[1] || !match[2]) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const unit = match[2];
  if (unit === 'kg') return `${Math.round(amount * 1000)}g`;
  if (unit === 'l') return `${Math.round(amount * 1000)}ml`;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${unit}`;
}

function percentKey(value: string): string | undefined {
  const match = value.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*%/);
  return match?.[1] ? `${Number.parseFloat(match[1])}%` : undefined;
}

function variantText(variant: ShopifyVariant): string {
  return [
    variant.title,
    variant.public_title,
    variant.option1,
    variant.option2,
    variant.option3,
    ...(variant.options ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
}

function exactVariant(product: ShopifyProduct, info: RowInfo, mapping: SiteMapping): ShopifyVariant | undefined {
  const wantedMeasure = measureKey(info.size);
  if (!wantedMeasure) return undefined;
  const wantedPercent = mapping.requirePercent ? percentKey(info.name) : undefined;

  const matches = (product.variants ?? []).filter((variant) => {
    const text = variantText(variant);
    if (measureKey(text) !== wantedMeasure) return false;
    if (wantedPercent && percentKey(text) !== wantedPercent) return false;
    return true;
  });

  return matches.length === 1 ? matches[0] : undefined;
}

function localePrefix(current: Locale): string {
  return current === 'en' ? '' : `/${current}`;
}

async function fetchProduct(handle: string, current: Locale): Promise<ShopifyProduct | undefined> {
  const key = `${current}:${handle}`;
  const cached = productCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const urls = [
      `${SHOP_ORIGIN}${localePrefix(current)}/products/${handle}.js`,
      ...(current === 'en' ? [] : [`${SHOP_ORIGIN}/products/${handle}.js`]),
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
        if (response.ok) return (await response.json()) as ShopifyProduct;
      } catch (error) {
        console.warn('[HOT Price List] Shopify SKU verification source unavailable.', { url, error });
      }
    }
    return undefined;
  })();

  productCache.set(key, request);
  return request;
}

function relabelCatalogueCode(dialog: HTMLDialogElement, info: RowInfo): void {
  const firstSpec = dialog.querySelector<HTMLElement>('.product-detail-specs .product-detail-spec');
  if (!firstSpec) return;
  const label = firstSpec.querySelector<HTMLElement>('span:not([data-site-sku-label])');
  const value = firstSpec.querySelector<HTMLElement>('strong:not([data-site-sku])');
  const text = copy[locale()];
  if (label && label.textContent !== text.catalogueCode) label.textContent = text.catalogueCode;
  if (value && value.textContent !== info.catalogueCode) value.textContent = info.catalogueCode;
}

function setSiteSku(dialog: HTMLDialogElement, sku: string | undefined): void {
  const firstSpec = dialog.querySelector<HTMLElement>('.product-detail-specs .product-detail-spec');
  if (!firstSpec) return;
  const existingLabel = firstSpec.querySelector<HTMLElement>('[data-site-sku-label]');
  const existingValue = firstSpec.querySelector<HTMLElement>('[data-site-sku]');

  if (!sku) {
    existingLabel?.remove();
    existingValue?.remove();
    return;
  }

  const expectedLabel = copy[locale()].siteSku;
  if (existingLabel && existingValue) {
    if (existingLabel.textContent !== expectedLabel) existingLabel.textContent = expectedLabel;
    if (existingValue.textContent !== sku) existingValue.textContent = sku;
    return;
  }

  existingLabel?.remove();
  existingValue?.remove();
  const label = document.createElement('span');
  label.dataset.siteSkuLabel = 'true';
  label.textContent = expectedLabel;
  label.style.marginTop = '8px';
  const value = document.createElement('strong');
  value.dataset.siteSku = 'true';
  value.textContent = sku;
  firstSpec.append(label, value);
}

function scrubUnverifiedRemoteContent(dialog: HTMLDialogElement): void {
  setSiteSku(dialog, undefined);
  const text = copy[locale()].noExactMatch;

  const loading = dialog.querySelector<HTMLElement>('.product-detail-loading');
  if (loading) {
    loading.className = 'product-detail-note';
    loading.textContent = text;
  }

  const sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (sections && sections.dataset.skuGuard !== 'unmatched') {
    sections.dataset.skuGuard = 'unmatched';
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
}

function expectedSourcePresent(dialog: HTMLDialogElement, handle: string): boolean {
  const source = dialog.querySelector<HTMLAnchorElement>('.product-detail-source');
  if (!source) return true;
  try {
    return new URL(source.href).pathname.includes(`/products/${handle}`);
  } catch {
    return false;
  }
}

async function auditDialog(dialog: HTMLDialogElement): Promise<void> {
  const info = rowInfo(dialog);
  if (!info) return;
  relabelCatalogueCode(dialog, info);

  const mapping = safeMapping(info);
  if (!mapping) {
    scrubUnverifiedRemoteContent(dialog);
    dialog.dataset.shopifyMatch = 'none';
    return;
  }

  if (!expectedSourcePresent(dialog, mapping.handle)) {
    scrubUnverifiedRemoteContent(dialog);
    dialog.dataset.shopifyMatch = 'source-mismatch';
    return;
  }

  const sequence = ++auditSequence;
  const product = await fetchProduct(mapping.handle, locale());
  if (sequence !== auditSequence || !dialog.open || dialog.dataset.sku !== info.catalogueCode) return;
  const variant = product ? exactVariant(product, info, mapping) : undefined;
  if (!variant) {
    scrubUnverifiedRemoteContent(dialog);
    dialog.dataset.shopifyMatch = 'variant-mismatch';
    return;
  }

  dialog.dataset.shopifyMatch = 'verified';
  const siteSku = compact(variant.sku);
  setSiteSku(dialog, siteSku || undefined);
}

function scheduleAudit(): void {
  if (auditScheduled) return;
  auditScheduled = true;
  queueMicrotask(() => {
    auditScheduled = false;
    const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
    if (dialog?.open) void auditDialog(dialog);
  });
}

const observer = new MutationObserver(scheduleAudit);
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', scheduleAudit);
document.addEventListener('keydown', scheduleAudit);

export {};
