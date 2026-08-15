type Locale = 'en' | 'it' | 'fr' | 'nl';

interface LocalizedProductPayload {
  available: boolean;
  locale?: Locale;
  product?: {
    handle: string;
    title: string;
    descriptionHtml: string;
    translated: boolean;
    translationAvailable: boolean;
    translatedFields: { title: boolean; bodyHtml: boolean };
  };
}

interface ParsedDetails {
  ingredients?: string;
  allergens?: string;
  usage?: string;
  storage?: string;
}

const copy = {
  en: {
    ingredients: 'Ingredients', allergens: 'Allergens', usage: 'How to use', storage: 'Storage',
    productInfo: 'Product information', nutrition: 'Nutrition / 100g', origin: 'Origin', shelfLife: 'Shelf life', barcode: 'Barcode',
    none: 'None', months: 'months', years: 'y',
    nutritionLabels: { energy: 'Energy', fat: 'Fat', saturates: 'Saturates', carbohydrates: 'Carbohydrates', sugars: 'Sugars', protein: 'Protein', salt: 'Salt', fibre: 'Fibre' },
  },
  it: {
    ingredients: 'Ingredienti', allergens: 'Allergeni', usage: 'Utilizzo', storage: 'Conservazione',
    productInfo: 'Informazioni prodotto', nutrition: 'Valori nutrizionali / 100g', origin: 'Origine', shelfLife: 'Durata di conservazione', barcode: 'Codice a barre',
    none: 'Nessuno', months: 'mesi', years: 'anni',
    nutritionLabels: { energy: 'Energia', fat: 'Grassi', saturates: 'di cui saturi', carbohydrates: 'Carboidrati', sugars: 'di cui zuccheri', protein: 'Proteine', salt: 'Sale', fibre: 'Fibre' },
  },
  fr: {
    ingredients: 'Ingrédients', allergens: 'Allergènes', usage: 'Comment utiliser', storage: 'Conservation',
    productInfo: 'Informations produit', nutrition: 'Valeurs nutritionnelles / 100g', origin: 'Origine', shelfLife: 'Durée de conservation', barcode: 'Code-barres',
    none: 'Aucun', months: 'mois', years: 'ans',
    nutritionLabels: { energy: 'Énergie', fat: 'Matières grasses', saturates: 'dont acides gras saturés', carbohydrates: 'Glucides', sugars: 'dont sucres', protein: 'Protéines', salt: 'Sel', fibre: 'Fibres' },
  },
  nl: {
    ingredients: 'Ingrediënten', allergens: 'Allergenen', usage: 'Gebruik', storage: 'Bewaring',
    productInfo: 'Productinformatie', nutrition: 'Voedingswaarden / 100g', origin: 'Herkomst', shelfLife: 'Houdbaarheid', barcode: 'Barcode',
    none: 'Geen', months: 'maanden', years: 'jaar',
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

function normalise(value: string): string {
  return compact(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function sourceHandle(dialog: HTMLDialogElement): string {
  const href = dialog.querySelector<HTMLAnchorElement>('.product-detail-source')?.href;
  if (!href) return '';
  try {
    const match = new URL(href).pathname.match(/\/products\/([^/?#]+)/);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

async function fetchLocalizedProduct(sku: string, currentLocale: Locale, handle: string): Promise<LocalizedProductPayload | undefined> {
  const key = `${currentLocale}:${sku}:${handle}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const request = (async () => {
    const params = new URLSearchParams({ sku, locale: currentLocale });
    if (handle) params.set('handle', handle);
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

function headingText(doc: Document, patterns: RegExp[]): string | undefined {
  for (const heading of doc.querySelectorAll('h2, h3, h4, summary, strong')) {
    const title = compact(heading.textContent);
    if (!patterns.some((pattern) => pattern.test(title))) continue;

    if (heading.tagName === 'STRONG') {
      const parent = heading.parentElement;
      if (!parent) continue;
      const clone = parent.cloneNode(true) as HTMLElement;
      clone.querySelector('strong')?.remove();
      const value = compact(clone.textContent);
      if (value) return value;
      continue;
    }

    if (heading.tagName === 'SUMMARY') {
      const value = compact(heading.parentElement?.querySelector('p')?.textContent);
      if (value) return value;
    }

    let sibling = heading.nextElementSibling;
    while (sibling && !/^H[234]$/.test(sibling.tagName)) {
      const value = compact(sibling.textContent);
      if (value) return value;
      sibling = sibling.nextElementSibling;
    }
  }
  return undefined;
}

function parseDetails(html: string): ParsedDetails {
  if (!html) return {};
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return {
    ingredients: headingText(doc, [/ingredients?/i, /ingredienti/i, /ingr[eé]dients?/i, /ingrediënten/i, /cosa contiene/i, /que contient/i, /wat zit/i]),
    allergens: headingText(doc, [/allergens?/i, /allergeni/i, /allerg[eè]nes?/i, /allergenen/i]),
    usage: headingText(doc, [/how to use/i, /^usage/i, /modalit[aà].*uso/i, /^utilizzo/i, /comment utiliser/i, /^utilisation/i, /^gebruik/i]),
    storage: headingText(doc, [/^storage/i, /conservazione/i, /conservation/i, /bewaring/i, /opslag/i]),
  };
}

function sectionValue(dialog: HTMLDialogElement, headingPatterns: RegExp[]): string | undefined {
  for (const section of dialog.querySelectorAll<HTMLElement>('.product-detail-section')) {
    const heading = compact(section.querySelector('h3')?.textContent);
    if (!headingPatterns.some((pattern) => pattern.test(heading))) continue;
    const value = compact(section.querySelector('p')?.textContent);
    if (value) return value;
  }
  return undefined;
}

function masterFacts(dialog: HTMLDialogElement): { origin?: string; shelfLife?: string; barcode?: string } {
  const output: { origin?: string; shelfLife?: string; barcode?: string } = {};
  for (const item of dialog.querySelectorAll<HTMLElement>('.product-detail-fact')) {
    const label = normalise(item.querySelector('span')?.textContent ?? '');
    const value = compact(item.querySelector('strong')?.textContent);
    if (!value) continue;
    if (/barcode|code-barres|codice a barre/.test(label)) output.barcode ??= value;
    else if (/shelf|durata|conservation|houdbaarheid/.test(label)) output.shelfLife ??= value;
    else if (/origin|origine|herkomst/.test(label)) output.origin ??= value;
  }
  return output;
}

function localizeOrigin(value: string | undefined, currentLocale: Locale): string | undefined {
  if (!value) return undefined;
  if (/^(italia|italy|italie|italië)$/i.test(value.trim())) {
    return ({ en: 'Italy', it: 'Italia', fr: 'Italie', nl: 'Italië' } as const)[currentLocale];
  }
  return value;
}

function localizeShelfLife(value: string | undefined, currentLocale: Locale): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+)\s*(months?|mesi|mois|maanden)/i);
  if (match?.[1]) return `${match[1]} ${copy[currentLocale].months}`;
  return value;
}

function localizeNone(value: string | undefined, currentLocale: Locale): string | undefined {
  if (!value) return undefined;
  if (/^(none|nessuno|aucun|geen)$/i.test(value.trim())) return copy[currentLocale].none;
  return value;
}

function localizeMeta(dialog: HTMLDialogElement, currentLocale: Locale): void {
  const meta = dialog.querySelector<HTMLElement>('.product-detail-meta');
  if (!meta) return;
  meta.textContent = compact(meta.textContent).replace(/\b(\d+)y\b/g, (_all, years: string) => {
    if (currentLocale === 'en') return `${years}y`;
    return `${years} ${copy[currentLocale].years}`;
  });
}

function currentNutrition(dialog: HTMLDialogElement): Array<{ key: keyof typeof copy.en.nutritionLabels; value: string }> {
  const aliases: Array<[keyof typeof copy.en.nutritionLabels, RegExp]> = [
    ['energy', /energy|energia|énergie|energie/i],
    ['fat', /^(fat|grassi|matières grasses|vetten)$/i],
    ['saturates', /saturat|saturi|acides gras satur|verzadigd/i],
    ['carbohydrates', /carbo|glucides|koolhydraten/i],
    ['sugars', /sugars|zuccheri|sucres|suikers/i],
    ['protein', /protein|proteine|protéines|eiwitten/i],
    ['salt', /^salt$|^sale$|^sel$|^zout$/i],
    ['fibre', /fibre|fiber|vezels/i],
  ];
  const items: Array<{ key: keyof typeof copy.en.nutritionLabels; value: string }> = [];
  for (const fact of dialog.querySelectorAll<HTMLElement>('.product-detail-fact')) {
    const label = compact(fact.querySelector('span')?.textContent);
    const value = compact(fact.querySelector('strong')?.textContent);
    if (!label || !value) continue;
    const matched = aliases.find(([, pattern]) => pattern.test(label));
    if (matched) items.push({ key: matched[0], value });
  }
  return items;
}

function renderSection(title: string, value: string | undefined): string {
  return value ? `<section class="product-detail-section"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p></section>` : '';
}

function renderFact(label: string, value: string | undefined): string {
  return value ? `<div class="product-detail-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>` : '';
}

function applyLocalizedContent(dialog: HTMLDialogElement, payload: LocalizedProductPayload, currentLocale: Locale): void {
  const product = payload.product;
  if (!product) return;
  const t = copy[currentLocale];
  const parsed = parseDetails(product.descriptionHtml);

  const existingIngredients = sectionValue(dialog, [/ingredients?/i, /ingredienti/i, /ingr[eé]dients?/i, /ingrediënten/i]);
  const existingAllergens = sectionValue(dialog, [/allergens?/i, /allergeni/i, /allerg[eè]nes?/i, /allergenen/i]);
  const existingUsage = sectionValue(dialog, [/how to use|usage|utilizzo|utilisation|comment utiliser|gebruik/i]);
  const existingStorage = sectionValue(dialog, [/storage|conservazione|conservation|bewaring/i]);
  const facts = masterFacts(dialog);
  const nutrition = currentNutrition(dialog);

  const title = dialog.querySelector<HTMLElement>('.product-detail-title');
  if (title && product.title) title.textContent = product.title;
  localizeMeta(dialog, currentLocale);

  const sections = dialog.querySelector<HTMLElement>('.product-detail-sections');
  if (sections) {
    const ingredients = parsed.ingredients ?? (currentLocale === 'it' ? existingIngredients : undefined);
    const allergens = localizeNone(parsed.allergens ?? existingAllergens, currentLocale);
    const usage = parsed.usage ?? (currentLocale === 'it' ? existingUsage : undefined);
    const storage = parsed.storage ?? (currentLocale === 'it' ? existingStorage : undefined);
    const productFacts = [
      renderFact(t.origin, localizeOrigin(facts.origin, currentLocale)),
      renderFact(t.shelfLife, localizeShelfLife(facts.shelfLife, currentLocale)),
      renderFact(t.barcode, facts.barcode),
    ].join('');
    const nutritionHtml = nutrition
      .map((item) => renderFact(t.nutritionLabels[item.key], item.value))
      .join('');

    sections.innerHTML = [
      renderSection(t.ingredients, ingredients),
      renderSection(t.allergens, allergens),
      renderSection(t.usage, usage),
      renderSection(t.storage, storage),
      productFacts ? `<section class="product-detail-section"><h3>${escapeHtml(t.productInfo)}</h3><div class="product-detail-facts">${productFacts}</div></section>` : '',
      nutritionHtml ? `<section class="product-detail-section"><h3>${escapeHtml(t.nutrition)}</h3><div class="product-detail-facts">${nutritionHtml}</div></section>` : '',
    ].join('');
  }

  const source = dialog.querySelector<HTMLAnchorElement>('.product-detail-source');
  if (source && product.handle) {
    const prefix = currentLocale === 'en' ? '' : `/${currentLocale}`;
    source.href = `https://houseoftartufo.com${prefix}/products/${product.handle}`;
  }

  dialog.dataset.productContentLocale = currentLocale;
  dialog.dataset.productContentTranslated = String(product.translated);
  dialog.dataset.productTranslationAvailable = String(product.translationAvailable);
}

async function localizeOpenDialog(): Promise<void> {
  const dialog = document.getElementById('product-detail-dialog') as HTMLDialogElement | null;
  if (!dialog?.open) return;
  const sku = dialog.dataset.sku?.trim();
  if (!sku) return;

  const currentLocale = locale();
  const handle = sourceHandle(dialog);
  const signature = `${currentLocale}:${sku}:${handle}`;
  if (dialog.dataset.productLocalizationSignature === signature) return;
  dialog.dataset.productLocalizationSignature = signature;

  const payload = await fetchLocalizedProduct(sku, currentLocale, handle);
  if (!payload?.available || !payload.product) {
    delete dialog.dataset.productLocalizationSignature;
    return;
  }

  if (!dialog.open || dialog.dataset.sku !== sku || locale() !== currentLocale) return;
  applyLocalizedContent(dialog, payload, currentLocale);
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
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'data-sku'] });
document.addEventListener('click', schedule);
document.addEventListener('keydown', schedule);

export {};
