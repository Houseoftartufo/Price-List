import './styles/product-details-guard.css';
import { findRemasteredOfficialVariant, type RemasteredOfficialVariant } from './official-product-remaster';
import { OFFICIAL_SHOPIFY_MAP } from './official-shopify-map';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const SHOP_ORIGIN = 'https://houseoftartufo.com';
let scheduled = false;

const copy = {
  en: { sku: 'SKU', casePack: 'Case pack', ingredients: 'Ingredients', allergens: 'Allergens', usage: 'How to use', storage: 'Storage', origin: 'Origin', productInfo: 'Product information', nutrition: 'Nutrition / 100g', shelfLife: 'Shelf life', barcode: 'Barcode', website: 'View product on houseoftartufo.com ↗', notOfficial: 'This row is not present in the official master product file.' },
  it: { sku: 'SKU', casePack: 'Pezzi / scatola', ingredients: 'Ingredienti', allergens: 'Allergeni', usage: 'Utilizzo', storage: 'Conservazione', origin: 'Origine', productInfo: 'Informazioni prodotto', nutrition: 'Valori nutrizionali / 100g', shelfLife: 'Shelf life', barcode: 'Barcode', website: 'Vedi prodotto su houseoftartufo.com ↗', notOfficial: 'Questa riga non è presente nel master prodotti ufficiale.' },
  fr: { sku: 'SKU', casePack: 'Pièces / carton', ingredients: 'Ingrédients', allergens: 'Allergènes', usage: 'Utilisation', storage: 'Conservation', origin: 'Origine', productInfo: 'Informations produit', nutrition: 'Valeurs nutritionnelles / 100g', shelfLife: 'Durée de conservation', barcode: 'Code-barres', website: 'Voir le produit sur houseoftartufo.com ↗', notOfficial: 'Cette ligne ne figure pas dans le fichier master produit officiel.' },
  nl: { sku: 'SKU', casePack: 'Stuks / doos', ingredients: 'Ingrediënten', allergens: 'Allergenen', usage: 'Gebruik', storage: 'Bewaring', origin: 'Herkomst', productInfo: 'Productinformatie', nutrition: 'Voedingswaarden / 100g', shelfLife: 'Houdbaarheid', barcode: 'Barcode', website: 'Bekijk product op houseoftartufo.com ↗', notOfficial: 'Deze rij staat niet in het officiële masterproductbestand.' },
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

interface RowInfo { sku: string; name: string; size: string; }

function rowInfo(dialog: HTMLDialogElement): RowInfo | undefined {
  const sku = dialog.dataset.sku?.trim();
  if (!sku) return undefined;
  const row = document.querySelector<HTMLTableRowElement>(`#product-rows tr[data-sku="${CSS.escape(sku)}"]`);
  if (!row) return undefined;
  const cells = row.querySelectorAll('td');
  const name = compact(row.querySelector('.product-name')?.textContent);
  const size = compact(cells[1]?.textContent);
  if (!name || !size) return undefined;
  return { sku, name, size };
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

function setCasePack(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const pack = specs(dialog)[2];
  if (!pack) return;
  const label = pack.querySelector<HTMLElement>('span');
  const value = pack.querySelector<HTMLElement>('strong');
  if (label) label.textContent = copy[locale()].casePack;
  if (value) value.textContent = String(entry.unitsPerCase);
}

function setImage(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (!media) return;
  const mapping = OFFICIAL_SHOPIFY_MAP[entry.officialKey];
  if (!mapping?.image) {
    media.innerHTML = '<div class="product-detail-image-stage" data-empty="true"></div>';
    return;
  }
  const alt = compact(dialog.querySelector('#product-detail-title')?.textContent) || entry.product;
  media.innerHTML = `<div class="product-detail-image-stage"><img data-product-detail-main-image src="${escapeHtml(mapping.image)}" alt="${escapeHtml(alt)}" loading="eager" /></div>`;
}

function setSourceLink(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  dialog.querySelector('.product-detail-source')?.remove();
  const mapping = OFFICIAL_SHOPIFY_MAP[entry.officialKey];
  if (!mapping?.handle) return;
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return;
  const link = document.createElement('a');
  link.className = 'product-detail-source';
  link.href = `${SHOP_ORIGIN}/products/${mapping.handle}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = copy[locale()].website;
  content.append(link);
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
  const rows = [
    n.energyKj !== undefined || n.energyKcal !== undefined ? fact('Energy', `${formatNumber(n.energyKj) ?? '—'} kJ · ${formatNumber(n.energyKcal) ?? '—'} kcal`) : '',
    n.fat !== undefined ? fact('Fat', `${formatNumber(n.fat)} g`) : '',
    n.saturates !== undefined ? fact('Saturates', `${formatNumber(n.saturates)} g`) : '',
    n.carbohydrates !== undefined ? fact('Carbohydrates', `${formatNumber(n.carbohydrates)} g`) : '',
    n.sugars !== undefined ? fact('Sugars', `${formatNumber(n.sugars)} g`) : '',
    n.protein !== undefined ? fact('Protein', `${formatNumber(n.protein)} g`) : '',
    n.salt !== undefined ? fact('Salt', `${formatNumber(n.salt)} g`) : '',
    n.fibre !== undefined ? fact('Fibre', `${formatNumber(n.fibre)} g`) : '',
  ].filter(Boolean).join('');
  return rows;
}

function renderOfficial(dialog: HTMLDialogElement, entry: RemasteredOfficialVariant): void {
  setOfficialSku(dialog, entry.sku);
  setCasePack(dialog, entry);
  setImage(dialog, entry);
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
  setSourceLink(dialog, entry);
  dialog.dataset.shopifyMatch = OFFICIAL_SHOPIFY_MAP[entry.officialKey] ? 'verified' : 'official';
  dialog.dataset.officialMaster = 'matched';
}

function renderNotOfficial(dialog: HTMLDialogElement): void {
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (media) media.innerHTML = '<div class="product-detail-image-stage" data-empty="true"></div>';
  dialog.querySelector('.product-detail-source')?.remove();
  const sections = ensureSections(dialog);
  if (sections) {
    sections.innerHTML = `<p class="product-detail-note">${escapeHtml(copy[locale()].notOfficial)}</p>`;
    delete sections.dataset.officialMasterKey;
  }
  dialog.dataset.shopifyMatch = 'none';
  dialog.dataset.officialMaster = 'none';
}

function applyOfficialMaster(): void {
  const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
  if (!dialog?.open) return;
  const info = rowInfo(dialog);
  if (!info) return;
  const entry = findRemasteredOfficialVariant(info.name, info.size);
  const key = entry?.officialKey;
  if (dialog.dataset.officialMaster === (entry ? 'matched' : 'none') && dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.officialMasterKey === key) return;
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
