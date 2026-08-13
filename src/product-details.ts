import './styles/product-details.css';

type Locale = 'en' | 'it' | 'fr' | 'nl';

interface RegistryProduct {
  handle: string;
  image: string;
}

interface ShopifyVariant {
  title?: string;
  public_title?: string | null;
}

interface ShopifyImageObject {
  src?: string;
}

interface ShopifyProduct {
  title?: string;
  handle?: string;
  description?: string;
  body_html?: string;
  images?: Array<string | ShopifyImageObject>;
  featured_image?: string | null;
  variants?: ShopifyVariant[];
}

interface ProductRowInfo {
  sku: string;
  name: string;
  meta: string;
  size: string;
  casePack: string;
}

interface ProductFacts {
  label: string;
  value: string;
}

interface ParsedProductDetails {
  description?: string;
  ingredients?: string;
  storage?: string;
  usage?: string;
  features: string[];
  facts: ProductFacts[];
}

const SHOP_ORIGIN = 'https://houseoftartufo.com';
const rowsEl = document.getElementById('product-rows');

const registry: Record<string, RegistryProduct> = {
  frozenSummer: {
    handle: 'frozen-summer-truffles-tuber-aestivum',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Frozen_Summer_Truffles_Aestivum_photo_1.webp?v=1778842334',
  },
  driedSummer: {
    handle: 'dried-summer-truffle-slices-tuber-aestivum',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/DehydratedSummerTrufflephoto1.webp?v=1778851290',
  },
  whiteSauce: {
    handle: 'white-truffle-sauce',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/05.1_White_Truffle_Sauce.webp?v=1736517835',
  },
  brumale: {
    handle: 'tuber-brumale-black-moscato-truffle',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Spring_Truffle_Brumale_Photo_1.webp?v=1778800336',
  },
  bianchetto: {
    handle: 'fresh-italian-bianchetto-truffle',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh-White-Truffle-Borchii-Photo-1.webp?v=1778795246',
  },
  summerCarpaccio: {
    handle: 'summer-truffle-carpaccio',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960',
  },
  whiteButter: {
    handle: 'white-truffle-butter',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836',
  },
  mayonnaise: {
    handle: 'vegan-black-truffle-mayonnaise',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/09.1_Black_Truffle_Mayo.webp?v=1736517836',
  },
  blackSauce: {
    handle: 'black-truffle-sauce',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },
  whiteOil: {
    handle: 'parfumed-white-truffle-extra-virgin-olive-oil',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835',
  },
  blackOil: {
    handle: 'black-truffle-extra-virgin-olive-oil',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835',
  },
  aestivum: {
    handle: 'summer-black-truffle-tuber-aestivum',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Summer_Truffle_Aestivum_Photo_1.webp?v=1778781787',
  },
  uncinatum: {
    handle: 'black-autumn-truffle-tuber-uncinatum',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Autumn_Truffle_Uncinatum_Photo_1.webp?v=1778785071',
  },
  melanosporum: {
    handle: 'winter-black-truffle-tuber-melanosporum',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh_Winter_Truffle_Melanosporum_Photo_1.webp?v=1778786821',
  },
  magnatum: {
    handle: 'fine-white-truffle-tuber-magnatum-pico',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/Fresh-White-Truffle-Magnatum-Pico-Photo-1.webp?v=1778794485',
  },
};

const labels = {
  en: {
    eyebrow: 'House of Tartufo · Product details',
    description: 'Description',
    ingredients: 'Ingredients',
    storage: 'Storage',
    usage: 'How to use',
    features: 'Key features',
    facts: 'Product information',
    sku: 'SKU',
    size: 'Size',
    casePack: 'Case pack',
    loading: 'Loading product information from houseoftartufo.com…',
    unavailable: 'A detailed public product page is not available yet. The commercial specifications above remain those of the verified wholesale catalogue.',
    website: 'View product on houseoftartufo.com ↗',
    close: 'Close product details',
    open: 'Open product details',
  },
  it: {
    eyebrow: 'House of Tartufo · Scheda prodotto',
    description: 'Descrizione',
    ingredients: 'Ingredienti',
    storage: 'Conservazione',
    usage: 'Utilizzo',
    features: 'Caratteristiche',
    facts: 'Informazioni prodotto',
    sku: 'SKU',
    size: 'Formato',
    casePack: 'Pezzi / scatola',
    loading: 'Caricamento delle informazioni da houseoftartufo.com…',
    unavailable: 'La scheda pubblica completa non è ancora disponibile sul sito. Le specifiche commerciali qui sopra restano quelle del catalogo wholesale verificato.',
    website: 'Vedi prodotto su houseoftartufo.com ↗',
    close: 'Chiudi scheda prodotto',
    open: 'Apri scheda prodotto',
  },
  fr: {
    eyebrow: 'House of Tartufo · Fiche produit',
    description: 'Description',
    ingredients: 'Ingrédients',
    storage: 'Conservation',
    usage: 'Utilisation',
    features: 'Caractéristiques',
    facts: 'Informations produit',
    sku: 'SKU',
    size: 'Format',
    casePack: 'Pièces / carton',
    loading: 'Chargement des informations depuis houseoftartufo.com…',
    unavailable: 'La fiche produit publique complète n’est pas encore disponible sur le site. Les spécifications commerciales ci-dessus restent celles du catalogue wholesale vérifié.',
    website: 'Voir le produit sur houseoftartufo.com ↗',
    close: 'Fermer la fiche produit',
    open: 'Ouvrir la fiche produit',
  },
  nl: {
    eyebrow: 'House of Tartufo · Productfiche',
    description: 'Beschrijving',
    ingredients: 'Ingrediënten',
    storage: 'Bewaring',
    usage: 'Gebruik',
    features: 'Kenmerken',
    facts: 'Productinformatie',
    sku: 'SKU',
    size: 'Formaat',
    casePack: 'Stuks / doos',
    loading: 'Productinformatie laden van houseoftartufo.com…',
    unavailable: 'De volledige openbare productfiche is nog niet beschikbaar op de website. De commerciële specificaties hierboven blijven die van de geverifieerde groothandelscatalogus.',
    website: 'Bekijk product op houseoftartufo.com ↗',
    close: 'Productfiche sluiten',
    open: 'Productfiche openen',
  },
} as const;

const productCache = new Map<string, Promise<ShopifyProduct | undefined>>();
let detailDialog: HTMLDialogElement | undefined;

function currentLocale(): Locale {
  const value = document.documentElement.lang.toLowerCase();
  if (value.startsWith('it')) return 'it';
  if (value.startsWith('fr')) return 'fr';
  if (value.startsWith('nl')) return 'nl';
  return 'en';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function compact(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function clip(value: string | undefined, max = 720): string | undefined {
  const clean = compact(value);
  if (!clean) return undefined;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
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

function matchRegistryProduct(name: string): RegistryProduct | undefined {
  const n = normalise(name);
  const has = (value: string) => n.includes(value);

  if (has('frozen') && (has('summer truffle') || has('aestivum'))) return registry.frozenSummer;
  if ((has('dried') || has('dehydrated')) && (has('summer truffle') || has('aestivum'))) return registry.driedSummer;
  if (has('summer truffle carpaccio')) return registry.summerCarpaccio;
  if (has('white truffle butter') || (has('butter') && has('bianchetto'))) return registry.whiteButter;
  if (has('black truffle mayonnaise') || has('truffle mayonnaise') || has('truffle mayo')) return registry.mayonnaise;
  if (has('white truffle') && (has('olive oil') || has('extra virgin oil'))) return registry.whiteOil;
  if (has('black truffle') && (has('olive oil') || has('extra virgin oil'))) return registry.blackOil;
  if (n === 'white truffle sauce' || n.startsWith('white truffle sauce ')) return registry.whiteSauce;
  if (n === 'black truffle sauce' || n.startsWith('black truffle sauce ') || (has('truffled sauce') && has('summer truffle'))) return registry.blackSauce;
  if (has('brumale') || has('moscato truffle')) return registry.brumale;
  if (has('uncinatum') || has('autumn truffle')) return registry.uncinatum;
  if (has('melanosporum') || has('winter black truffle')) return registry.melanosporum;
  if (has('magnatum') || has('fine white truffle') || has('fresh white truffle')) return registry.magnatum;
  if (has('bianchetto') && !has('cream') && !has('carpaccio') && !has('butter') && !has('sauce') && !has('oil')) return registry.bianchetto;
  if (has('summer black truffle') || (has('aestivum') && has('black truffle'))) return registry.aestivum;
  return undefined;
}

function localePrefix(locale: Locale): string {
  return locale === 'en' ? '' : `/${locale}`;
}

function productUrl(handle: string, locale: Locale): string {
  return `${SHOP_ORIGIN}${localePrefix(locale)}/products/${handle}`;
}

async function fetchShopifyProduct(handle: string, locale: Locale): Promise<ShopifyProduct | undefined> {
  const key = `${locale}:${handle}`;
  const cached = productCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const urls = [
      `${productUrl(handle, locale)}.js`,
      ...(locale === 'en' ? [] : [`${SHOP_ORIGIN}/products/${handle}.js`]),
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) continue;
        return (await response.json()) as ShopifyProduct;
      } catch (error) {
        console.warn('[HOT Price List] Product detail source unavailable.', { url, error });
      }
    }
    return undefined;
  })();

  productCache.set(key, request);
  return request;
}

function elementText(element: Element | null | undefined): string {
  return compact(element?.textContent);
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

function headingMatches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function sectionText(doc: Document, patterns: RegExp[]): string | undefined {
  for (const heading of doc.querySelectorAll('h2, h3, h4, summary')) {
    const title = elementText(heading);
    if (!headingMatches(title, patterns)) continue;

    if (heading.tagName.toLowerCase() === 'summary') {
      const parent = heading.parentElement;
      const paragraph = parent?.querySelector('p');
      const value = elementText(paragraph);
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
    const question = elementText(strong);
    if (!headingMatches(question, patterns)) continue;
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
    if (text.length < 70 || text.length > 520 || !cue.test(text)) continue;
    if (/shipping|spedizione|livraison|verzending/i.test(text)) continue;
    return clip(text, 520);
  }
  return undefined;
}

function featureList(doc: Document): string[] {
  const patterns = [
    /key features/i,
    /caratteristiche principali/i,
    /caractéristiques/i,
    /belangrijkste kenmerken/i,
    /^kenmerken$/i,
  ];

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

function productFacts(doc: Document): ProductFacts[] {
  const facts: ProductFacts[] = [];
  for (const item of doc.querySelectorAll('.hot-facts > div')) {
    const label = elementText(item.querySelector('span'));
    const value = elementText(item.querySelector('strong'));
    if (label && value) facts.push({ label, value });
  }
  return facts.slice(0, 6);
}

function parseProductDetails(html: string | undefined): ParsedProductDetails {
  if (!html) return { features: [], facts: [] };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const ingredientPatterns = [
    /ingredients?/i,
    /what.?s in it/i,
    /cosa contiene/i,
    /ingredienti/i,
    /ingr[eé]dients?/i,
    /que contient/i,
    /ingrediënten/i,
    /wat zit/i,
  ];

  return {
    description: firstParagraph(doc),
    ingredients:
      questionAnswer(doc, ingredientPatterns) ??
      sectionText(doc, ingredientPatterns) ??
      inferredIngredients(doc),
    storage: sectionText(doc, [/^storage/i, /conservazione/i, /conservation/i, /bewaring/i, /opslag/i]),
    usage: sectionText(doc, [/how to use/i, /^usage/i, /modalit[aà].?d.?uso/i, /^utilizzo/i, /^utilisation/i, /^gebruik/i]),
    features: featureList(doc),
    facts: productFacts(doc),
  };
}

function imageUrls(product: ShopifyProduct | undefined, fallback?: string): string[] {
  const urls = (product?.images ?? [])
    .map((image) => (typeof image === 'string' ? image : image.src))
    .filter((image): image is string => Boolean(image))
    .map((image) => (image.startsWith('//') ? `https:${image}` : image));

  const featured = product?.featured_image;
  if (featured) urls.unshift(featured.startsWith('//') ? `https:${featured}` : featured);
  if (fallback) urls.push(fallback);
  return [...new Set(urls)].slice(0, 6);
}

function getRowInfo(row: HTMLTableRowElement): ProductRowInfo | undefined {
  const sku = row.dataset.sku?.trim();
  const name = compact(row.querySelector('.product-name')?.textContent);
  if (!sku || !name) return undefined;
  const cells = row.querySelectorAll('td');
  return {
    sku,
    name,
    meta: compact(row.querySelector('.product-meta')?.textContent),
    size: compact(cells[1]?.textContent),
    casePack: compact(cells[2]?.textContent),
  };
}

function ensureDialog(): HTMLDialogElement {
  if (detailDialog) return detailDialog;
  const dialog = document.createElement('dialog');
  dialog.id = 'product-detail-dialog';
  dialog.className = 'product-detail-dialog';
  dialog.setAttribute('aria-labelledby', 'product-detail-title');
  document.body.append(dialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
    const close = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-product-detail-close]');
    if (close) dialog.close();

    const thumb = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-product-detail-image]');
    const image = thumb?.dataset.productDetailImage;
    if (!thumb || !image) return;
    const main = dialog.querySelector<HTMLImageElement>('[data-product-detail-main-image]');
    if (main) main.src = image;
    dialog.querySelectorAll<HTMLButtonElement>('[data-product-detail-image]').forEach((button) => {
      button.setAttribute('aria-current', String(button === thumb));
    });
  });

  detailDialog = dialog;
  return dialog;
}

function renderMedia(images: string[], name: string): string {
  if (images.length === 0) {
    return `<div class="product-detail-media">
      <div class="product-detail-image-stage" data-empty="true"></div>
    </div>`;
  }

  return `<div class="product-detail-media">
    <div class="product-detail-image-stage">
      <img data-product-detail-main-image src="${escapeHtml(images[0] ?? '')}" alt="${escapeHtml(name)}" loading="eager" />
    </div>
    ${
      images.length > 1
        ? `<div class="product-detail-thumbs" aria-label="${escapeHtml(name)}">
            ${images
              .map(
                (image, index) => `<button class="product-detail-thumb" type="button" data-product-detail-image="${escapeHtml(image)}" aria-current="${String(index === 0)}" aria-label="${escapeHtml(name)} ${index + 1}">
                  <img src="${escapeHtml(image)}" alt="" loading="lazy" />
                </button>`,
              )
              .join('')}
          </div>`
        : ''
    }
  </div>`;
}

function section(title: string, content: string | undefined): string {
  if (!content) return '';
  return `<section class="product-detail-section"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p></section>`;
}

function renderDialog(
  info: ProductRowInfo,
  matched: RegistryProduct | undefined,
  product: ShopifyProduct | undefined,
  loading: boolean,
): void {
  const dialog = ensureDialog();
  const locale = currentLocale();
  const t = labels[locale];
  const parsed = parseProductDetails(product?.description ?? product?.body_html);
  const images = imageUrls(product, matched?.image);
  const sourceUrl = matched ? productUrl(matched.handle, locale) : undefined;
  const featureHtml = parsed.features.length
    ? `<section class="product-detail-section"><h3>${escapeHtml(t.features)}</h3><ul>${parsed.features.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  const factsHtml = parsed.facts.length
    ? `<section class="product-detail-section"><h3>${escapeHtml(t.facts)}</h3><div class="product-detail-facts">${parsed.facts
        .map((fact) => `<div class="product-detail-fact"><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`)
        .join('')}</div></section>`
    : '';

  dialog.dataset.sku = info.sku;
  dialog.innerHTML = `<div class="product-detail-shell">
    ${renderMedia(images, info.name)}
    <div class="product-detail-content">
      <div class="product-detail-topline">
        <div>
          <p class="product-detail-eyebrow">${escapeHtml(t.eyebrow)}</p>
          <h2 class="product-detail-title" id="product-detail-title">${escapeHtml(info.name)}</h2>
          ${info.meta ? `<p class="product-detail-meta">${escapeHtml(info.meta)}</p>` : ''}
        </div>
        <button class="product-detail-close" type="button" data-product-detail-close aria-label="${escapeHtml(t.close)}">×</button>
      </div>

      <div class="product-detail-specs">
        <div class="product-detail-spec"><span>${escapeHtml(t.sku)}</span><strong>${escapeHtml(info.sku)}</strong></div>
        <div class="product-detail-spec"><span>${escapeHtml(t.size)}</span><strong>${escapeHtml(info.size || '—')}</strong></div>
        <div class="product-detail-spec"><span>${escapeHtml(t.casePack)}</span><strong>${escapeHtml(info.casePack || '—')}</strong></div>
      </div>

      ${
        loading
          ? `<p class="product-detail-loading" aria-live="polite">${escapeHtml(t.loading)}</p>`
          : `<div class="product-detail-sections">
              ${section(t.description, parsed.description)}
              ${section(t.ingredients, parsed.ingredients)}
              ${factsHtml}
              ${section(t.usage, parsed.usage)}
              ${section(t.storage, parsed.storage)}
              ${featureHtml}
              ${!matched ? `<p class="product-detail-note">${escapeHtml(t.unavailable)}</p>` : ''}
            </div>
            ${sourceUrl ? `<a class="product-detail-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(t.website)}</a>` : ''}`
      }
    </div>
  </div>`;
}

async function openProductDetails(row: HTMLTableRowElement): Promise<void> {
  const info = getRowInfo(row);
  if (!info) return;
  const matched = matchRegistryProduct(info.name);
  const dialog = ensureDialog();
  renderDialog(info, matched, undefined, Boolean(matched));
  if (!dialog.open) dialog.showModal();
  if (!matched) return;

  const product = await fetchShopifyProduct(matched.handle, currentLocale());
  if (!dialog.open || dialog.dataset.sku !== info.sku) return;
  renderDialog(info, matched, product, false);
}

function enhanceProductCells(): void {
  if (!rowsEl) return;
  const t = labels[currentLocale()];
  rowsEl.querySelectorAll<HTMLElement>('.product-cell').forEach((cell) => {
    cell.dataset.productDetailsReady = 'true';
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-haspopup', 'dialog');
    const name = compact(cell.querySelector('.product-name')?.textContent);
    cell.setAttribute('aria-label', `${t.open}: ${name}`);
  });
}

if (rowsEl) {
  rowsEl.addEventListener('click', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.product-cell[data-product-details-ready="true"]');
    const row = cell?.closest<HTMLTableRowElement>('tr[data-sku]');
    if (row) void openProductDetails(row);
  });

  rowsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.product-cell[data-product-details-ready="true"]');
    const row = cell?.closest<HTMLTableRowElement>('tr[data-sku]');
    if (!row) return;
    event.preventDefault();
    void openProductDetails(row);
  });

  const observer = new MutationObserver(enhanceProductCells);
  observer.observe(rowsEl, { childList: true, subtree: true });
  enhanceProductCells();
}

document.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('[data-locale]') && detailDialog?.open) {
    detailDialog.close();
  }
});
