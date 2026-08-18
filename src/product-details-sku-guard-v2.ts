import './styles/product-details-guard.css';
import { findRemasteredOfficialVariantBySku, type RemasteredOfficialVariant } from './official-product-remaster';
import { OFFICIAL_SHOPIFY_MAP } from './official-shopify-map';
import { getShopifyLiveProduct, getShopifyLiveVariant, type ShopifyLiveImage } from './shopify-live';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const SHOP_ORIGIN = 'https://houseoftartufo.com';
let scheduled = false;

const copy = {
  en: { sku: 'SKU', size: 'Size', casePack: 'Case pack', ingredients: 'Ingredients', allergens: 'Allergens', usage: 'How to use', storage: 'Storage', origin: 'Origin', productInfo: 'Product information', nutrition: 'Nutrition / 100g', shelfLife: 'Shelf life', barcode: 'Barcode', website: 'View product on houseoftartufo.com ↗', notOfficial: 'This row is not present in the official master product file.' },
  it: { sku: 'SKU', size: 'Formato', casePack: 'Pezzi / scatola', ingredients: 'Ingredienti', allergens: 'Allergeni', usage: 'Utilizzo', storage: 'Conservazione', origin: 'Origine', productInfo: 'Informazioni prodotto', nutrition: 'Valori nutrizionali / 100g', shelfLife: 'Shelf life', barcode: 'Barcode', website: 'Vedi prodotto su houseoftartufo.com ↗', notOfficial: 'Questa riga non è presente nel master prodotti ufficiale.' },
  fr: { sku: 'SKU', size: 'Format', casePack: 'Pièces / carton', ingredients: 'Ingrédients', allergens: 'Allergènes', usage: 'Utilisation', storage: 'Conservation', origin: 'Origine', productInfo: 'Informations produit', nutrition: 'Valeurs nutritionnelles / 100g', shelfLife: 'Durée de conservation', barcode: 'Code-barres', website: 'Voir le produit sur houseoftartufo.com ↗', notOfficial: 'Cette ligne ne figure pas dans le fichier master produit officiel.' },
  nl: { sku: 'SKU', size: 'Formaat', casePack: 'Stuks / doos', ingredients: 'Ingrediënten', allergens: 'Allergenen', usage: 'Gebruik', storage: 'Bewaring', origin: 'Herkomst', productInfo: 'Productinformatie', nutrition: 'Voedingswaarden / 100g', shelfLife: 'Houdbaarheid', barcode: 'Barcode', website: 'Bekijk product op houseoftartufo.com ↗', notOfficial: 'Deze rij staat niet in het officiële masterproductbestand.' },
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

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function dialogSku(dialog: HTMLDialogElement): string | undefined {
  const sku = dialog.dataset.sku?.trim();
  return sku || undefined;
}

function specs(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>('.product-detail-specs .product-detail-spec')];
}

function setOfficialSku(dialog: HTMLDialogElement, sku: string): void {
  const first = specs(dialog)[0];
  if (!first) return;
  first.querySelectorAll('[data-official-sku-label], [data-site-sku-label], [data-site-sku]').forEach((node) => node.remove());
  const label = first.querySelector<HTMLElement>('span');
  const value = first.querySelector<HTMLElement>('strong');
  if (label) label.textContent = copy[locale()].sku;
  if (value) {
    value.textContent = sku;
    value.dataset.officialSku = 'true';
  }
}

function setSize(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const size = specs(dialog)[1];
  if (!size) return;
  const label = size.querySelector<HTMLElement>('span');
  const value = size.querySelector<HTMLElement>('strong');
  if (label) label.textContent = copy[locale()].size;
  if (value) value.textContent = entry.size;
}

function setCasePack(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const pack = specs(dialog)[2];
  if (!pack) return;
  const label = pack.querySelector<HTMLElement>('span');
  const value = pack.querySelector<HTMLElement>('strong');
  if (label) label.textContent = copy[locale()].casePack;
  if (value) value.textContent = String(entry.unitsPerCase);
}

function imageStage(dialog: HTMLDialogElement): HTMLElement | undefined {
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (!media) return undefined;
  let stage = media.querySelector<HTMLElement>('.product-detail-image-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'product-detail-image-stage';
    media.replaceChildren(stage);
  }
  return stage;
}

function setImageUrl(dialog: HTMLDialogElement, image: ShopifyLiveImage | { url: string; alt?: string | null }): void {
  const stage = imageStage(dialog);
  if (!stage) return;
  const img = document.createElement('img');
  img.dataset.productDetailMainImage = 'true';
  img.src = image.url;
  img.alt = compact(image.alt) || compact(dialog.querySelector('#product-detail-title')?.textContent) || 'House of Tartufo product';
  img.loading = 'eager';
  stage.removeAttribute('data-empty');
  stage.replaceChildren(img);
}

function setStaticImage(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const stage = imageStage(dialog);
  if (!stage) return;
  const mapping = OFFICIAL_SHOPIFY_MAP[entry.officialKey];
  if (!mapping?.image) {
    stage.dataset.empty = 'true';
    stage.replaceChildren();
    return;
  }
  setImageUrl(dialog, { url: mapping.image, alt: entry.product });
}

function setSourceUrl(dialog: HTMLDialogElement, url: string | undefined): void {
  dialog.querySelector('.product-detail-source')?.remove();
  if (!url) return;
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return;
  const link = document.createElement('a');
  link.className = 'product-detail-source';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = copy[locale()].website;
  content.append(link);
}

function setStaticSourceLink(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const mapping = OFFICIAL_SHOPIFY_MAP[entry.officialKey];
  setSourceUrl(dialog, mapping?.handle ? `${SHOP_ORIGIN}/products/${mapping.handle}` : undefined);
}

function ensureSections(dialog: HTMLDialogElement): HTMLElement | undefined {
  let sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (sections) return sections;
  sections = document.createElement('div');
  sections.className = 'product-detail-sections';
  const loading = dialog.querySelector<HTMLElement>('.product-detail-loading');
  if (loading) { loading.replaceWith(sections); return sections; }
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return undefined;
  const source = dialog.querySelector('.product-detail-source');
  if (source) content.insertBefore(sections, source); else content.append(sections);
  return sections;
}

function fact(label: string, value: string): string {
  return `<div class="product-detail-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function formatNumber(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

function nutritionFacts(entry: RemasteredOfficialVariant): string {
  const n = entry.nutrition;
  return [
    n.energyKj !== undefined || n.energyKcal !== undefined ? fact('Energy', `${formatNumber(n.energyKj) ?? '—'} kJ · ${formatNumber(n.energyKcal) ?? '—'} kcal`) : '',
    n.fat !== undefined ? fact('Fat', `${formatNumber(n.fat)} g`) : '',
    n.saturates !== undefined ? fact('Saturates', `${formatNumber(n.saturates)} g`) : '',
    n.carbohydrates !== undefined ? fact('Carbohydrates', `${formatNumber(n.carbohydrates)} g`) : '',
    n.sugars !== undefined ? fact('Sugars', `${formatNumber(n.sugars)} g`) : '',
    n.protein !== undefined ? fact('Protein', `${formatNumber(n.protein)} g`) : '',
    n.salt !== undefined ? fact('Salt', `${formatNumber(n.salt)} g`) : '',
    n.fibre !== undefined ? fact('Fibre', `${formatNumber(n.fibre)} g`) : '',
  ].filter(Boolean).join('');
}

async function enrichFromShopify(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): Promise<void> {
  if (dialog.dataset.shopifyLiveRequested === entry.sku) return;
  dialog.dataset.shopifyLiveRequested = entry.sku;

  const match = await getShopifyLiveVariant(entry.sku);
  if (match) {
    if (!dialog.open || dialogSku(dialog) !== entry.sku) return;

    if (match.variant.barcode && match.variant.barcode !== entry.barcode) {
      console.warn('[HOT Price List] Shopify/master barcode mismatch', {
        sku: entry.sku,
        masterBarcode: entry.barcode,
        shopifyBarcode: match.variant.barcode,
      });
    }

    const liveImage = match.variant.media[0] ?? match.product.media[0];
    if (liveImage) setImageUrl(dialog, liveImage);

    const publishedUrl = match.product.status === 'ACTIVE' ? match.product.onlineStoreUrl ?? undefined : undefined;
    setSourceUrl(dialog, publishedUrl);
    dialog.dataset.shopifyMatch = 'live-api';
    dialog.dataset.shopifyStatus = match.product.status.toLowerCase();
    dialog.dataset.shopifyUpdatedAt = match.product.updatedAt;
    return;
  }

  const reference = entry.shopify;
  const handles = reference
    ? [reference.publicHandle, reference.handle].filter((value): value is string => Boolean(value))
    : [];
  if (!handles.length) return;

  const product = await getShopifyLiveProduct(handles);
  if (!product || !dialog.open || dialogSku(dialog) !== entry.sku) return;

  const liveImage = product.media[0];
  if (liveImage) setImageUrl(dialog, liveImage);
  const publishedUrl = product.status === 'ACTIVE' ? product.onlineStoreUrl ?? undefined : undefined;
  setSourceUrl(dialog, publishedUrl);
  dialog.dataset.shopifyMatch = 'live-api-family';
  dialog.dataset.shopifyStatus = product.status.toLowerCase();
  dialog.dataset.shopifyUpdatedAt = product.updatedAt;
  dialog.dataset.shopifyFamilyFallback = 'true';
}

function renderOfficial(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  setOfficialSku(dialog, entry.sku);
  setSize(dialog, entry);
  setCasePack(dialog, entry);
  setStaticImage(dialog, entry);
  const sections = ensureSections(dialog);
  if (sections) {
    const t = copy[locale()];
    const nutrition = nutritionFacts(entry);
    sections.innerHTML = `
      <section class="product-detail-section"><h3>${escapeHtml(t.ingredients)}</h3><p>${escapeHtml(entry.ingredients)}</p></section>
      <section class="product-detail-section"><h3>${escapeHtml(t.allergens)}</h3><p>${escapeHtml(entry.allergens)}</p></section>
      <section class="product-detail-section"><h3>${escapeHtml(t.usage)}</h3><p>${escapeHtml(entry.usage)}</p></section>
      <section class="product-detail-section"><h3>${escapeHtml(t.storage)}</h3><p>${escapeHtml(entry.storage)}</p></section>
      <section class="product-detail-section"><h3>${escapeHtml(t.productInfo)}</h3><div class="product-detail-facts">${fact(t.origin, entry.origin)}${fact(t.shelfLife, entry.shelfLife)}${fact(t.barcode, entry.barcode)}</div></section>
      ${nutrition ? `<section class="product-detail-section"><h3>${escapeHtml(t.nutrition)}</h3><div class="product-detail-facts">${nutrition}</div></section>` : ''}
    `;
    sections.dataset.officialMasterKey = entry.officialKey;
  }
  setStaticSourceLink(dialog, entry);
  dialog.dataset.shopifyMatch = OFFICIAL_SHOPIFY_MAP[entry.officialKey] ? 'fallback-verified' : 'master-only';
  dialog.dataset.officialMaster = 'matched';
  delete dialog.dataset.shopifyFamilyFallback;
  void enrichFromShopify(dialog, entry);
}

function renderNotOfficial(dialog: HTMLDialogElement): void {
  const stage = imageStage(dialog);
  if (stage) {
    stage.dataset.empty = 'true';
    stage.replaceChildren();
  }
  setSourceUrl(dialog, undefined);
  const sections = ensureSections(dialog);
  if (sections) {
    sections.innerHTML = `<p class="product-detail-note">${escapeHtml(copy[locale()].notOfficial)}</p>`;
    delete sections.dataset.officialMasterKey;
  }
  delete dialog.dataset.shopifyLiveRequested;
  delete dialog.dataset.shopifyFamilyFallback;
  dialog.dataset.shopifyMatch = 'none';
  dialog.dataset.officialMaster = 'none';
}

function applyOfficialMaster(): void {
  const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
  if (!dialog?.open) return;
  const sku = dialogSku(dialog);
  if (!sku) return;
  const entry = findRemasteredOfficialVariantBySku(sku);
  const key = entry?.officialKey;
  if (dialog.dataset.officialMaster === (entry ? 'matched' : 'none') && dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.officialMasterKey === key) return;
  delete dialog.dataset.shopifyLiveRequested;
  delete dialog.dataset.shopifyFamilyFallback;
  if (entry) renderOfficial(dialog, entry); else renderNotOfficial(dialog);
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; applyOfficialMaster(); });
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', schedule);
document.addEventListener('keydown', schedule);

export {};
