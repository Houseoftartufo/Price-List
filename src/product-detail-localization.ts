import { OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from './official-product-master';
import {
  translateMasterDetail,
  translateMasterTitle,
  type ProductDetailLocale as Locale,
} from './product-detail-master-translations';

interface LocalizedProductPayload {
  available: boolean;
  locale?: Locale;
  product?: {
    handle: string;
    title: string;
    translated: boolean;
    translationAvailable: boolean;
  };
}

const copy = {
  en: {
    eyebrow: 'Product details', sku: 'SKU', size: 'Size', casePack: 'Case pack',
    ingredients: 'Ingredients', allergens: 'Allergens', usage: 'How to use', storage: 'Storage',
    productInfo: 'Product information', nutrition: 'Nutrition / 100g', origin: 'Origin', shelfLife: 'Shelf life', barcode: 'Barcode',
    months: 'months', years: 'y', website: 'View product on houseoftartufo.com ↗',
    nutritionLabels: { energy: 'Energy', fat: 'Fat', saturates: 'Saturates', carbohydrates: 'Carbohydrates', sugars: 'Sugars', protein: 'Protein', salt: 'Salt', fibre: 'Fibre' },
  },
  it: {
    eyebrow: 'Dettagli prodotto', sku: 'SKU', size: 'Formato', casePack: 'Pezzi / scatola',
    ingredients: 'Ingredienti', allergens: 'Allergeni', usage: 'Utilizzo', storage: 'Conservazione',
    productInfo: 'Informazioni prodotto', nutrition: 'Valori nutrizionali / 100g', origin: 'Origine', shelfLife: 'Durata di conservazione', barcode: 'Codice a barre',
    months: 'mesi', years: 'anni', website: 'Vedi prodotto su houseoftartufo.com ↗',
    nutritionLabels: { energy: 'Energia', fat: 'Grassi', saturates: 'di cui saturi', carbohydrates: 'Carboidrati', sugars: 'di cui zuccheri', protein: 'Proteine', salt: 'Sale', fibre: 'Fibre' },
  },
  fr: {
    eyebrow: 'Détails produit', sku: 'SKU', size: 'Format', casePack: 'Pièces / carton',
    ingredients: 'Ingrédients', allergens: 'Allergènes', usage: 'Utilisation', storage: 'Conservation',
    productInfo: 'Informations produit', nutrition: 'Valeurs nutritionnelles / 100g', origin: 'Origine', shelfLife: 'Durée de conservation', barcode: 'Code-barres',
    months: 'mois', years: 'ans', website: 'Voir le produit sur houseoftartufo.com ↗',
    nutritionLabels: { energy: 'Énergie', fat: 'Matières grasses', saturates: 'dont acides gras saturés', carbohydrates: 'Glucides', sugars: 'dont sucres', protein: 'Protéines', salt: 'Sel', fibre: 'Fibres' },
  },
  nl: {
    eyebrow: 'Productdetails', sku: 'SKU', size: 'Formaat', casePack: 'Stuks / doos',
    ingredients: 'Ingrediënten', allergens: 'Allergenen', usage: 'Gebruik', storage: 'Bewaring',
    productInfo: 'Productinformatie', nutrition: 'Voedingswaarden / 100g', origin: 'Herkomst', shelfLife: 'Houdbaarheid', barcode: 'Barcode',
    months: 'maanden', years: 'jaar', website: 'Bekijk product op houseoftartufo.com ↗',
    nutritionLabels: { energy: 'Energie', fat: 'Vetten', saturates: 'waarvan verzadigd', carbohydrates: 'Koolhydraten', sugars: 'waarvan suikers', protein: 'Eiwitten', salt: 'Zout', fibre: 'Vezels' },
  },
} as const;

const cache = new Map<string, Promise<LocalizedProductPayload | undefined>>();
let scheduled = false;

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

function entryForSku(sku: string): OfficialProductVariant | undefined {
  return OFFICIAL_PRODUCT_VARIANTS.find((entry) => entry.sku === sku);
}

function sourceHandle(dialog: HTMLDialogElement): string {
  const href = dialog.querySelector<HTMLAnchorElement>('.product-detail-source')?.href;
  if (!href) return '';
  try {
    return new URL(href).pathname.match(/\/products\/([^/?#]+)/)?.[1] ?? '';
  } catch {
    return '';
  }
}

async function fetchPublishedTitle(sku: string, currentLocale: Locale, handle: string): Promise<LocalizedProductPayload | undefined> {
  if (!handle) return undefined;
  const key = `${currentLocale}:${sku}:${handle}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const request = (async () => {
    const params = new URLSearchParams({ sku, locale: currentLocale, handle });
    try {
      const response = await fetch(`/api/shopify-product-translation?${params.toString()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return undefined;
      return await response.json() as LocalizedProductPayload;
    } catch {
      return undefined;
    }
  })();
  cache.set(key, request);
  return request;
}

function number(value: number, currentLocale: Locale): string {
  return new Intl.NumberFormat(currentLocale === 'en' ? 'en-GB' : currentLocale, { maximumFractionDigits: 2 }).format(value);
}

function fact(label: string, value: string): string {
  return `<div class="product-detail-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function nutritionFacts(entry: OfficialProductVariant, currentLocale: Locale): string {
  const n = entry.nutrition;
  const labels = copy[currentLocale].nutritionLabels;
  return [
    n.energyKj !== undefined || n.energyKcal !== undefined
      ? fact(labels.energy, `${n.energyKj === undefined ? '—' : number(n.energyKj, currentLocale)} kJ · ${n.energyKcal === undefined ? '—' : number(n.energyKcal, currentLocale)} kcal`)
      : '',
    n.fat !== undefined ? fact(labels.fat, `${number(n.fat, currentLocale)} g`) : '',
    n.saturates !== undefined ? fact(labels.saturates, `${number(n.saturates, currentLocale)} g`) : '',
    n.carbohydrates !== undefined ? fact(labels.carbohydrates, `${number(n.carbohydrates, currentLocale)} g`) : '',
    n.sugars !== undefined ? fact(labels.sugars, `${number(n.sugars, currentLocale)} g`) : '',
    n.protein !== undefined ? fact(labels.protein, `${number(n.protein, currentLocale)} g`) : '',
    n.salt !== undefined ? fact(labels.salt, `${number(n.salt, currentLocale)} g`) : '',
    n.fibre !== undefined ? fact(labels.fibre, `${number(n.fibre, currentLocale)} g`) : '',
  ].filter(Boolean).join('');
}

function localizedOrigin(value: string, currentLocale: Locale): string {
  if (/^(italia|italy|italie|italië)$/i.test(value.trim())) {
    return ({ en: 'Italy', it: 'Italia', fr: 'Italie', nl: 'Italië' } as const)[currentLocale];
  }
  return value;
}

function localizedShelfLife(value: string, currentLocale: Locale): string {
  const match = value.match(/(\d+)\s*(months?|mesi|mois|maanden)/i);
  return match?.[1] ? `${match[1]} ${copy[currentLocale].months}` : value;
}

function localizeChrome(dialog: HTMLDialogElement, currentLocale: Locale): void {
  const t = copy[currentLocale];
  const eyebrow = dialog.querySelector<HTMLElement>('.product-detail-eyebrow');
  if (eyebrow) eyebrow.textContent = `House of Tartufo · ${t.eyebrow}`;

  const specs = [...dialog.querySelectorAll<HTMLElement>('.product-detail-specs .product-detail-spec')];
  const labels = [t.sku, t.size, t.casePack];
  specs.forEach((spec, index) => {
    const label = spec.querySelector<HTMLElement>('span');
    if (label && labels[index]) label.textContent = labels[index];
  });

  const meta = dialog.querySelector<HTMLElement>('.product-detail-meta');
  if (meta) {
    meta.textContent = compact(meta.textContent).replace(/\b(\d+)y\b/g, (_all, years: string) => currentLocale === 'en' ? `${years}y` : `${years} ${t.years}`);
  }

  const source = dialog.querySelector<HTMLAnchorElement>('.product-detail-source');
  if (source) source.textContent = t.website;
}

function renderMasterTranslation(dialog: HTMLDialogElement, entry: OfficialProductVariant, currentLocale: Locale): void {
  const t = copy[currentLocale];
  const title = dialog.querySelector<HTMLElement>('.product-detail-title');
  if (title) title.textContent = translateMasterTitle(entry.product, currentLocale);
  localizeChrome(dialog, currentLocale);

  const sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (!sections) return;
  const nutrition = nutritionFacts(entry, currentLocale);
  sections.innerHTML = `
    <span hidden data-product-localized-sentinel="${currentLocale}"></span>
    <section class="product-detail-section"><h3>${escapeHtml(t.ingredients)}</h3><p>${escapeHtml(translateMasterDetail('ingredients', entry.ingredients, currentLocale))}</p></section>
    <section class="product-detail-section"><h3>${escapeHtml(t.allergens)}</h3><p>${escapeHtml(translateMasterDetail('allergens', entry.allergens, currentLocale))}</p></section>
    <section class="product-detail-section"><h3>${escapeHtml(t.usage)}</h3><p>${escapeHtml(translateMasterDetail('usage', entry.usage, currentLocale))}</p></section>
    <section class="product-detail-section"><h3>${escapeHtml(t.storage)}</h3><p>${escapeHtml(translateMasterDetail('storage', entry.storage, currentLocale))}</p></section>
    <section class="product-detail-section"><h3>${escapeHtml(t.productInfo)}</h3><div class="product-detail-facts">${fact(t.origin, localizedOrigin(entry.origin, currentLocale))}${fact(t.shelfLife, localizedShelfLife(entry.shelfLife, currentLocale))}${fact(t.barcode, entry.barcode)}</div></section>
    ${nutrition ? `<section class="product-detail-section"><h3>${escapeHtml(t.nutrition)}</h3><div class="product-detail-facts">${nutrition}</div></section>` : ''}
  `;
  dialog.dataset.productContentLocale = currentLocale;
  dialog.dataset.productContentTranslated = 'true';
  dialog.dataset.productTranslationSource = 'official-master';
}

async function localizeOpenDialog(): Promise<void> {
  const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
  if (!dialog?.open) return;
  const sku = dialog.dataset.sku?.trim();
  if (!sku) return;
  const entry = entryForSku(sku);
  if (!entry) return;

  const currentLocale = locale();
  const sentinel = dialog.querySelector(`[data-product-localized-sentinel="${currentLocale}"]`);
  if (!sentinel) renderMasterTranslation(dialog, entry, currentLocale);

  const handle = sourceHandle(dialog);
  const signature = `${currentLocale}:${sku}:${handle}`;
  if (dialog.dataset.productPublishedTitleSignature === signature) return;
  dialog.dataset.productPublishedTitleSignature = signature;

  const payload = await fetchPublishedTitle(sku, currentLocale, handle);
  if (!payload?.available || !payload.product?.title) return;
  if (!dialog.open || dialog.dataset.sku !== sku || locale() !== currentLocale) return;

  const title = dialog.querySelector<HTMLElement>('.product-detail-title');
  if (title) title.textContent = payload.product.title;
  const source = dialog.querySelector<HTMLAnchorElement>('.product-detail-source');
  if (source && payload.product.handle) {
    const prefix = currentLocale === 'en' ? '' : `/${currentLocale}`;
    source.href = `https://houseoftartufo.com${prefix}/products/${payload.product.handle}`;
    source.textContent = copy[currentLocale].website;
  }
  dialog.dataset.productTranslationSource = 'published-title+official-master';
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    void localizeOpenDialog();
  }, 0);
}

const observer = new MutationObserver(schedule);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['open', 'data-sku', 'href'],
});
document.addEventListener('click', schedule);
document.addEventListener('keydown', schedule);

export {};
