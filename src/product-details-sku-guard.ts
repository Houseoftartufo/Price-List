import './styles/product-details-guard.css';
import { VERIFIED_PRODUCT_DETAIL_MAP, type VerifiedProductDetailMapping } from './product-detail-map';

type Locale = 'en' | 'it' | 'fr' | 'nl';

interface RowInfo {
  catalogueCode: string;
  name: string;
  size: string;
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

interface ShopifyImageObject {
  src?: string;
}

interface ShopifyProduct {
  title?: string;
  description?: string;
  body_html?: string;
  images?: Array<string | ShopifyImageObject>;
  featured_image?: string | null;
  variants?: ShopifyVariant[];
}

interface ProductFact {
  label: string;
  value: string;
}

interface ParsedDetails {
  description?: string;
  ingredients?: string;
  storage?: string;
  usage?: string;
  features: string[];
  facts: ProductFact[];
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const productCache = new Map<string, Promise<ShopifyProduct | undefined>>();
let auditSequence = 0;
let auditScheduled = false;

const copy = {
  en: {
    catalogueCode: 'Catalogue code',
    siteSku: 'Site SKU',
    description: 'Description',
    ingredients: 'Ingredients',
    storage: 'Storage',
    usage: 'How to use',
    features: 'Key features',
    facts: 'Product information',
    website: 'View product on houseoftartufo.com ↗',
    noExactMatch: 'No exact public Shopify variant matches this wholesale format. To avoid showing the wrong SKU, photo or ingredients, only the verified catalogue specifications are displayed.',
  },
  it: {
    catalogueCode: 'Codice catalogo',
    siteSku: 'SKU sito',
    description: 'Descrizione',
    ingredients: 'Ingredienti',
    storage: 'Conservazione',
    usage: 'Utilizzo',
    features: 'Caratteristiche',
    facts: 'Informazioni prodotto',
    website: 'Vedi prodotto su houseoftartufo.com ↗',
    noExactMatch: 'Nessuna variante Shopify pubblica corrisponde esattamente a questo formato wholesale. Per evitare SKU, foto o ingredienti sbagliati, mostriamo solo le specifiche verificate del listino.',
  },
  fr: {
    catalogueCode: 'Code catalogue',
    siteSku: 'SKU du site',
    description: 'Description',
    ingredients: 'Ingrédients',
    storage: 'Conservation',
    usage: 'Utilisation',
    features: 'Caractéristiques',
    facts: 'Informations produit',
    website: 'Voir le produit sur houseoftartufo.com ↗',
    noExactMatch: 'Aucune variante Shopify publique ne correspond exactement à ce format wholesale. Afin d’éviter un SKU, une photo ou des ingrédients incorrects, seules les spécifications vérifiées du catalogue sont affichées.',
  },
  nl: {
    catalogueCode: 'Cataloguscode',
    siteSku: 'Website-SKU',
    description: 'Beschrijving',
    ingredients: 'Ingrediënten',
    storage: 'Bewaring',
    usage: 'Gebruik',
    features: 'Kenmerken',
    facts: 'Productinformatie',
    website: 'Bekijk product op houseoftartufo.com ↗',
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clip(value: string | undefined, max = 720): string | undefined {
  const clean = compact(value);
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
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
        console.warn('[HOT Price List] Exact Shopify product source unavailable.', { url, error });
      }
    }
    return undefined;
  })();

  productCache.set(key, request);
  return request;
}

function exactVariant(product: ShopifyProduct, mapping: VerifiedProductDetailMapping): ShopifyVariant | undefined {
  const matches = (product.variants ?? []).filter((variant) => compact(variant.sku) === mapping.siteSku);
  return matches.length === 1 ? matches[0] : undefined;
}

function elementText(element: Element | null | undefined): string {
  return compact(element?.textContent);
}

function headingMatches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function firstParagraph(doc: Document): string | undefined {
  const lead = elementText(doc.querySelector('.hot-lead'));
  if (lead) return clip(lead);
  const rejected = /shipping|spedizione|livraison|verzending|order|ordinare|communit|whatsapp|category:|categoria:|catégorie:|categorie:/i;
  for (const paragraph of doc.querySelectorAll('p')) {
    const text = elementText(paragraph);
    if (text.length >= 55 && !rejected.test(text)) return clip(text);
  }
  return undefined;
}

function sectionText(doc: Document, patterns: RegExp[]): string | undefined {
  for (const heading of doc.querySelectorAll('h2, h3, h4, summary')) {
    const title = elementText(heading);
    if (!headingMatches(title, patterns)) continue;
    if (heading.tagName.toLowerCase() === 'summary') {
      const value = elementText(heading.parentElement?.querySelector('p'));
      if (value) return clip(value);
    }
    let sibling = heading.nextElementSibling;
    while (sibling && !/^H[234]$/.test(sibling.tagName)) {
      const value = elementText(sibling);
      if (value) return clip(value);
      sibling = sibling.nextElementSibling;
    }
  }
  return undefined;
}

function questionAnswer(doc: Document, patterns: RegExp[]): string | undefined {
  for (const strong of doc.querySelectorAll('strong')) {
    if (!headingMatches(elementText(strong), patterns)) continue;
    const parent = strong.parentElement;
    if (!parent) continue;
    const clone = parent.cloneNode(true) as HTMLElement;
    clone.querySelector('strong')?.remove();
    const answer = elementText(clone);
    if (answer) return clip(answer, 520);
  }
  return undefined;
}

function inferredIngredients(doc: Document): string | undefined {
  const cue = /made with|crafted with|base of|prodotto con|realizzato con|composto da|élaboré avec|préparé avec|gemaakt met|bereid met/i;
  for (const paragraph of doc.querySelectorAll('p')) {
    const text = elementText(paragraph);
    if (text.length >= 70 && text.length <= 520 && cue.test(text) && !/shipping|spedizione|livraison|verzending/i.test(text)) {
      return clip(text, 520);
    }
  }
  return undefined;
}

function featureList(doc: Document): string[] {
  const patterns = [/key features/i, /caratteristiche principali/i, /caractéristiques/i, /belangrijkste kenmerken/i, /^kenmerken$/i];
  for (const heading of doc.querySelectorAll('h2, h3, h4')) {
    if (!headingMatches(elementText(heading), patterns)) continue;
    let sibling = heading.nextElementSibling;
    while (sibling && !/^H[234]$/.test(sibling.tagName)) {
      if (sibling.tagName.toLowerCase() === 'ul') {
        return [...sibling.querySelectorAll('li')]
          .map((item) => clip(elementText(item), 180))
          .filter((item): item is string => Boolean(item))
          .slice(0, 6);
      }
      sibling = sibling.nextElementSibling;
    }
  }
  return [];
}

function productFacts(doc: Document): ProductFact[] {
  const facts: ProductFact[] = [];
  for (const item of doc.querySelectorAll('.hot-facts > div')) {
    const label = elementText(item.querySelector('span'));
    const value = elementText(item.querySelector('strong'));
    if (label && value) facts.push({ label, value });
  }
  return facts.slice(0, 6);
}

function parseDetails(html: string | undefined): ParsedDetails {
  if (!html) return { features: [], facts: [] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const ingredientPatterns = [/ingredients?/i, /what.?s in it/i, /cosa contiene/i, /ingredienti/i, /ingr[eé]dients?/i, /que contient/i, /ingrediënten/i, /wat zit/i];
  return {
    description: firstParagraph(doc),
    ingredients: questionAnswer(doc, ingredientPatterns) ?? sectionText(doc, ingredientPatterns) ?? inferredIngredients(doc),
    storage: sectionText(doc, [/^storage/i, /conservazione/i, /conservation/i, /bewaring/i, /opslag/i]),
    usage: sectionText(doc, [/how to use/i, /^usage/i, /modalit[aà].?d.?uso/i, /^utilizzo/i, /^utilisation/i, /^gebruik/i]),
    features: featureList(doc),
    facts: productFacts(doc),
  };
}

function imageUrls(product: ShopifyProduct, mapping: VerifiedProductDetailMapping): string[] {
  const images = (product.images ?? [])
    .map((image) => (typeof image === 'string' ? image : image.src))
    .filter((image): image is string => Boolean(image))
    .map((image) => (image.startsWith('//') ? `https:${image}` : image));
  if (product.featured_image) images.unshift(product.featured_image.startsWith('//') ? `https:${product.featured_image}` : product.featured_image);
  images.push(mapping.image);
  return [...new Set(images)].slice(0, 6);
}

function relabelCatalogueCode(dialog: HTMLDialogElement, info: RowInfo): void {
  const firstSpec = dialog.querySelector<HTMLElement>('.product-detail-specs .product-detail-spec');
  if (!firstSpec) return;
  const label = firstSpec.querySelector<HTMLElement>('span:not([data-site-sku-label])');
  const value = firstSpec.querySelector<HTMLElement>('strong:not([data-site-sku])');
  const text = copy[locale()];
  if (label) label.textContent = text.catalogueCode;
  if (value) value.textContent = info.catalogueCode;
}

function setSiteSku(dialog: HTMLDialogElement, sku: string | undefined): void {
  const firstSpec = dialog.querySelector<HTMLElement>('.product-detail-specs .product-detail-spec');
  if (!firstSpec) return;
  firstSpec.querySelector('[data-site-sku-label]')?.remove();
  firstSpec.querySelector('[data-site-sku]')?.remove();
  if (!sku) return;
  const label = document.createElement('span');
  label.dataset.siteSkuLabel = 'true';
  label.textContent = copy[locale()].siteSku;
  label.style.marginTop = '8px';
  const value = document.createElement('strong');
  value.dataset.siteSku = 'true';
  value.textContent = sku;
  firstSpec.append(label, value);
}

function renderSection(title: string, content: string | undefined): string {
  if (!content) return '';
  return `<section class="product-detail-section"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p></section>`;
}

function renderMedia(images: string[], name: string): string {
  if (!images.length) return '<div class="product-detail-image-stage" data-empty="true"></div>';
  const thumbs = images.length > 1
    ? `<div class="product-detail-thumbs" aria-label="${escapeHtml(name)}">${images.map((image, index) => `<button class="product-detail-thumb" type="button" data-product-detail-image="${escapeHtml(image)}" aria-current="${String(index === 0)}" aria-label="${escapeHtml(name)} ${index + 1}"><img src="${escapeHtml(image)}" alt="" loading="lazy" /></button>`).join('')}</div>`
    : '';
  return `<div class="product-detail-image-stage"><img data-product-detail-main-image src="${escapeHtml(images[0] ?? '')}" alt="${escapeHtml(name)}" loading="eager" /></div>${thumbs}`;
}

function ensureSourceLink(dialog: HTMLDialogElement, mapping: VerifiedProductDetailMapping): void {
  dialog.querySelector('.product-detail-source')?.remove();
  const content = dialog.querySelector<HTMLElement>('.product-detail-content');
  if (!content) return;
  const link = document.createElement('a');
  link.className = 'product-detail-source';
  link.href = productUrl(mapping.handle, locale());
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = copy[locale()].website;
  content.append(link);
}

function renderVerified(dialog: HTMLDialogElement, info: RowInfo, mapping: VerifiedProductDetailMapping, product: ShopifyProduct): void {
  relabelCatalogueCode(dialog, info);
  setSiteSku(dialog, mapping.siteSku);
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (media) media.innerHTML = renderMedia(imageUrls(product, mapping), info.name);

  const parsed = parseDetails(product.description ?? product.body_html);
  const text = copy[locale()];
  const featureHtml = parsed.features.length
    ? `<section class="product-detail-section"><h3>${escapeHtml(text.features)}</h3><ul>${parsed.features.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  const factsHtml = parsed.facts.length
    ? `<section class="product-detail-section"><h3>${escapeHtml(text.facts)}</h3><div class="product-detail-facts">${parsed.facts.map((fact) => `<div class="product-detail-fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`).join('')}</div></section>`
    : '';

  let sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (!sections) {
    const content = dialog.querySelector<HTMLElement>('.product-detail-content');
    const loading = dialog.querySelector<HTMLElement>('.product-detail-loading');
    sections = document.createElement('div');
    sections.className = 'product-detail-sections';
    loading?.replaceWith(sections);
    if (!sections.isConnected) content?.append(sections);
  }
  sections.dataset.skuGuard = 'verified';
  sections.dataset.skuGuardKey = `${info.catalogueCode}:${mapping.siteSku}`;
  sections.innerHTML = [
    renderSection(text.description, parsed.description),
    renderSection(text.ingredients, parsed.ingredients),
    factsHtml,
    renderSection(text.usage, parsed.usage),
    renderSection(text.storage, parsed.storage),
    featureHtml,
  ].join('');
  ensureSourceLink(dialog, mapping);
  dialog.dataset.shopifyMatch = 'verified';
}

function scrubUnverified(dialog: HTMLDialogElement, info: RowInfo, status = 'none'): void {
  relabelCatalogueCode(dialog, info);
  setSiteSku(dialog, undefined);
  dialog.querySelector('.product-detail-source')?.remove();
  const media = dialog.querySelector<HTMLElement>('.product-detail-media');
  if (media) media.innerHTML = '<div class="product-detail-image-stage" data-empty="true"></div>';

  const text = copy[locale()].noExactMatch;
  let sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  const loading = dialog.querySelector<HTMLElement>('.product-detail-loading');
  if (!sections) {
    sections = document.createElement('div');
    sections.className = 'product-detail-sections';
    loading?.replaceWith(sections);
  }
  if (sections) {
    sections.dataset.skuGuard = 'unmatched';
    sections.dataset.skuGuardKey = info.catalogueCode;
    sections.innerHTML = `<p class="product-detail-note">${escapeHtml(text)}</p>`;
  } else if (loading) {
    loading.className = 'product-detail-note';
    loading.textContent = text;
  }
  dialog.dataset.shopifyMatch = status;
}

function hasVerifiedMarker(dialog: HTMLDialogElement, info: RowInfo, mapping: VerifiedProductDetailMapping): boolean {
  return dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.skuGuardKey === `${info.catalogueCode}:${mapping.siteSku}`
    && dialog.querySelector<HTMLElement>('[data-site-sku]')?.textContent === mapping.siteSku;
}

function hasUnmatchedMarker(dialog: HTMLDialogElement, info: RowInfo): boolean {
  return dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.skuGuardKey === info.catalogueCode
    && dialog.querySelector<HTMLElement>('.product-detail-sections')?.dataset.skuGuard === 'unmatched';
}

async function auditDialog(dialog: HTMLDialogElement): Promise<void> {
  const info = rowInfo(dialog);
  if (!info) return;
  relabelCatalogueCode(dialog, info);
  const mapping = VERIFIED_PRODUCT_DETAIL_MAP[info.catalogueCode];

  if (!mapping) {
    if (!hasUnmatchedMarker(dialog, info)) scrubUnverified(dialog, info, 'none');
    return;
  }

  if (dialog.dataset.shopifyMatch === 'verified' && hasVerifiedMarker(dialog, info, mapping)) return;
  const auditKey = `${info.catalogueCode}:${mapping.siteSku}:${locale()}`;
  if (dialog.dataset.skuGuardPending === auditKey) return;
  dialog.dataset.skuGuardPending = auditKey;
  dialog.dataset.shopifyMatch = 'pending';

  const sequence = ++auditSequence;
  const product = await fetchProduct(mapping.handle, locale());
  if (sequence !== auditSequence || !dialog.open || dialog.dataset.sku !== info.catalogueCode) return;
  delete dialog.dataset.skuGuardPending;
  const variant = product ? exactVariant(product, mapping) : undefined;
  if (!product || !variant) {
    scrubUnverified(dialog, info, 'variant-mismatch');
    return;
  }
  renderVerified(dialog, info, mapping, product);
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
