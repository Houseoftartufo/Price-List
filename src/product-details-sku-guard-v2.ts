import './styles/product-details-guard.css';
import { findOfficialProductVariant, type OfficialProductVariant } from './official-product-master';

type Locale = 'en' | 'it' | 'fr' | 'nl';

const SHOP_ORIGIN = 'https://houseoftartufo.com';
let scheduled = false;

const copy = {
  en: {
    catalogueCode: 'Catalogue code',
    sku: 'SKU',
    casePack: 'Case pack',
    ingredients: 'Ingredients',
    website: 'View product on houseoftartufo.com ↗',
    pendingPack: 'Case pack pending final verification.',
    notOfficial: 'This catalogue row is not matched to the official product master. No Shopify data is shown.',
  },
  it: {
    catalogueCode: 'Codice catalogo',
    sku: 'SKU',
    casePack: 'Pezzi / scatola',
    ingredients: 'Ingredienti',
    website: 'Vedi prodotto su houseoftartufo.com ↗',
    pendingPack: 'Pezzi per scatola in attesa di verifica finale.',
    notOfficial: 'Questa riga non corrisponde al master prodotti ufficiale. Non mostriamo dati Shopify.',
  },
  fr: {
    catalogueCode: 'Code catalogue',
    sku: 'SKU',
    casePack: 'Pièces / carton',
    ingredients: 'Ingrédients',
    website: 'Voir le produit sur houseoftartufo.com ↗',
    pendingPack: 'Pièces par carton en attente de vérification finale.',
    notOfficial: 'Cette ligne ne correspond pas au master produit officiel. Aucune donnée Shopify n’est affichée.',
  },
  nl: {
    catalogueCode: 'Cataloguscode',
    sku: 'SKU',
    casePack: 'Stuks / doos',
    ingredients: 'Ingrediënten',
    website: 'Bekijk product op houseoftartufo.com ↗',
    pendingPack: 'Stuks per doos wachten op definitieve verificatie.',
    notOfficial: 'Deze rij komt niet overeen met de officiële productmaster. Er worden geen Shopify-gegevens getoond.',
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

interface RowInfo {
  catalogueCode: string;
  name: string;
  size: string;
}

function rowInfo(dialog: HTMLDialogElement): RowInfo | undefined {
  const catalogueCode = dialog.dataset.sku?.trim();
  if (!catalogueCode) return undefined;
  const row = document.querySelector<HTMLTableRowElement>(
    `#product-rows tr[data-sku="${CSS.escape(catalogueCode)}"]`,
  );
  if (!row) return undefined;
  const cells = row.querySelectorAll('td');
  const name = compact(row.querySelector('.product-name')?.textContent);
  const size = compact(cells[1]?.textContent);
  if (!name || !size) return undefined;
  return { catalogueCode, name, size };
}

function specs(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>('.product-detail-specs .product-detail-spec')];
}

function setCatalogueCode(dialog: HTMLDialogElement, code: string): void {
  const first = specs(dialog)[0];
  if (!first) return;
  const label = first.querySelector<HTMLElement>('span:not([data-official-sku-label])');
  const value = first.querySelector<HTMLElement>('strong:not([data-official-sku])');
  if (label) label.textContent = copy[locale()].catalogueCode;
  if (value) value.textContent = code;
}

function setOfficialSku(dialog: HTMLDialogElement, sku: string | undefined): void {
  const first = specs(dialog)[0];
  if (!first) return;
  first.querySelector('[data-site-sku-label]')?.remove();
  first.querySelector('[data-site-sku]')?.remove();
  first.querySelector('[data-official-sku-label]')?.remove();
  first.querySelector('[data-official-sku]')?.remove();
  if (!sku) return;

  const label = document.createElement('span');
  label.dataset.officialSkuLabel = 'true';
  label.style.marginTop = '8px';
  label.textContent = copy[locale()].sku;

  const value = document.createElement('strong');
  value.dataset.officialSku = 'true';
  value.textContent = sku;
  first.append(label, value);
}

function setCasePack(dialog: HTMLDialogElement, entry: OfficialProductVariant | undefined): void {
  const pack = specs(dialog)[2];
  if (!pack) return;
  const label = pack.querySelector<HTMLElement>('span');
  const value = pack.querySelector<HTMLElement>('strong');
  if (label) label.textContent = copy[locale()].casePack;
  if (!value) return;
  value.textContent = entry?.packStatus === 'resolved' && entry.unitsPerCase
    ? String(entry.unitsPerCase)
    : '—';
}

function setImage(dialog: HTMLDialogElement, entry: OfficialProductVariant | undefined): void {
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (!media) return;
  const imageUrl = entry?.shopifyImage;
  if (!imageUrl) {
    media.innerHTML = '<div class="product-detail-image-stage" data-empty="true"></div>';
    return;
  }
  const alt = compact(dialog.querySelector('#product-detail-title')?.textContent) || entry.product;
  media.innerHTML = `<div class="product-detail-image-stage">
    <img data-product-detail-main-image src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" loading="eager" />
  </div>`;
}

function setSourceLink(dialog: HTMLDialogElement, entry: OfficialProductVariant | undefined): void {
  dialog.querySelector('.product-detail-source')?.remove();
  if (!entry?.shopifyHandle) return;
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return;

  const link = document.createElement('a');
  link.className = 'product-detail-source';
  link.href = `${SHOP_ORIGIN}/products/${entry.shopifyHandle}`;
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
  if (loading) {
    loading.replaceWith(sections);
    return sections;
  }
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return undefined;
  const source = dialog.querySelector('.product-detail-source');
  if (source) content.insertBefore(sections, source);
  else content.append(sections);
  return sections;
}

function renderOfficial(dialog: HTMLDialogElement, info: RowInfo, entry: OfficialProductVariant): void {
  setCatalogueCode(dialog, info.catalogueCode);
  setOfficialSku(dialog, entry.sku);
  setCasePack(dialog, entry);
  setImage(dialog, entry);

  const sections = ensureSections(dialog);
  if (sections) {
    const t = copy[locale()];
    const pending = entry.packStatus === 'resolved'
      ? ''
      : `<p class="product-detail-note">${escapeHtml(t.pendingPack)}</p>`;
    sections.innerHTML = `
      <section class="product-detail-section">
        <h3>${escapeHtml(t.ingredients)}</h3>
        <p>${escapeHtml(entry.ingredients)}</p>
      </section>
      ${pending}
    `;
    sections.dataset.officialMasterKey = `${entry.product}:${entry.size}`;
  }
  setSourceLink(dialog, entry);
  dialog.dataset.shopifyMatch = 'official';
  dialog.dataset.officialMaster = 'matched';
}

function renderNotOfficial(dialog: HTMLDialogElement, info: RowInfo): void {
  setCatalogueCode(dialog, info.catalogueCode);
  setOfficialSku(dialog, undefined);
  setCasePack(dialog, undefined);
  setImage(dialog, undefined);
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
  const entry = findOfficialProductVariant(info.name, info.size);
  const key = entry ? `${entry.product}:${entry.size}` : undefined;
  if (
    dialog.dataset.officialMaster === (entry ? 'matched' : 'none')
    && dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.officialMasterKey === key
  ) {
    return;
  }
  if (entry) renderOfficial(dialog, info, entry);
  else renderNotOfficial(dialog, info);
}

function schedule(): void {
  const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
  if (dialog?.open) dialog.dataset.shopifyMatch = 'pending';
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applyOfficialMaster();
  });
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', schedule);
document.addEventListener('keydown', schedule);

export {};
