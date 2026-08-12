export type Locale = 'en' | 'it' | 'fr' | 'nl';
export type TranslationDictionary = Record<string, string>;
export type TranslationBundle = Record<Locale, TranslationDictionary>;

const TRANSLATIONS_URL = '/data/translations.snapshot.json';
const LOCALE_KEY = 'hot-price-list:locale:v1';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'it', 'fr', 'nl'] as const;

export const CATEGORY_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  'sauces-condiments': 'nav.slide2',
  oils: 'nav.slide3',
  butters: 'nav.slide4',
  'pure-creams-carpaccio': 'nav.slide5',
  'brine-whole-truffles': 'nav.slide6',
  'salts-honey': 'nav.slide7',
  'pasta-rice-meals': 'nav.slide8',
  'natural-line': 'nav.slide9',
};

export const PREVIEW_COPY: Record<Locale, Record<string, string>> = {
  en: {
    wholesale: 'Wholesale Catalogue',
    verified: 'Verified prices',
    stale: 'Saved verified prices',
    fallback: 'Verified snapshot',
    searchPlaceholder: 'Search SKU, product, size…',
    searchLabel: 'Search catalogue',
    allCategories: 'All products',
    allLines: 'All lines',
    standardLine: 'Standard',
    naturalLine: 'Natural Line',
    allTruffles: 'All truffles',
    white: 'White',
    black: 'Black',
    summer: 'Summer',
    bianchetto: 'Bianchetto',
    mixed: 'Mixed',
    none: 'Other',
    products: 'products',
    categories: 'categories',
    upToDiscount: 'Up to 25% volume discount',
    sku: 'SKU',
    product: 'Product',
    size: 'Size',
    casePack: 'Case pack',
    basePrice: 'Base price',
    bestPrice: 'Best price',
    cases: 'Cases',
    yourPrice: 'Your price',
    perUnit: '/ unit',
    perCase: '/ case',
    subtotal: 'Subtotal',
    saving: 'Saving',
    addToQuote: 'Add to quote',
    updateQuote: 'Update quote',
    quote: 'Quote',
    quoteTitle: 'Quote request',
    quoteEmpty: 'Add products to build your wholesale request.',
    remove: 'Remove',
    close: 'Close',
    copyOrder: 'Copy order',
    copied: 'Copied',
    whatsapp: 'Send on WhatsApp',
    clearQuote: 'Clear quote',
    total: 'Estimated total',
    exWorks: 'Prices ex-works, excluding VAT and shipping.',
    noResults: 'No products match these filters.',
    resetFilters: 'Reset filters',
    browse: 'Browse catalogue',
    heroEyebrow: 'House of Tartufo · B2B',
    heroTitle: 'The wholesale catalogue, built to move fast.',
    heroBody: 'Search, compare volume pricing and prepare a quote without leaving the catalogue.',
    sourceUpdated: 'Verified',
    discountTier: 'volume discount',
  },
  it: {
    wholesale: 'Catalogo Wholesale',
    verified: 'Prezzi verificati',
    stale: 'Prezzi verificati salvati',
    fallback: 'Snapshot verificato',
    searchPlaceholder: 'Cerca SKU, prodotto, formato…',
    searchLabel: 'Cerca nel catalogo',
    allCategories: 'Tutti i prodotti',
    allLines: 'Tutte le linee',
    standardLine: 'Standard',
    naturalLine: 'Natural Line',
    allTruffles: 'Tutti i tartufi',
    white: 'Bianco',
    black: 'Nero',
    summer: 'Estivo',
    bianchetto: 'Bianchetto',
    mixed: 'Misto',
    none: 'Altro',
    products: 'prodotti',
    categories: 'categorie',
    upToDiscount: 'Fino al 25% di sconto volume',
    sku: 'SKU',
    product: 'Prodotto',
    size: 'Formato',
    casePack: 'Pz/scatola',
    basePrice: 'Prezzo base',
    bestPrice: 'Miglior prezzo',
    cases: 'Scatole',
    yourPrice: 'Il tuo prezzo',
    perUnit: '/ unità',
    perCase: '/ scatola',
    subtotal: 'Subtotale',
    saving: 'Risparmio',
    addToQuote: 'Aggiungi al preventivo',
    updateQuote: 'Aggiorna preventivo',
    quote: 'Preventivo',
    quoteTitle: 'Richiesta preventivo',
    quoteEmpty: 'Aggiungi prodotti per preparare la richiesta wholesale.',
    remove: 'Rimuovi',
    close: 'Chiudi',
    copyOrder: 'Copia ordine',
    copied: 'Copiato',
    whatsapp: 'Invia su WhatsApp',
    clearQuote: 'Svuota preventivo',
    total: 'Totale stimato',
    exWorks: 'Prezzi ex-works, IVA e spedizione escluse.',
    noResults: 'Nessun prodotto corrisponde ai filtri.',
    resetFilters: 'Azzera filtri',
    browse: 'Sfoglia catalogo',
    heroEyebrow: 'House of Tartufo · B2B',
    heroTitle: 'Il catalogo wholesale, pensato per andare veloce.',
    heroBody: 'Cerca, confronta i prezzi volume e prepara un preventivo senza uscire dal catalogo.',
    sourceUpdated: 'Verificato',
    discountTier: 'sconto volume',
  },
  fr: {
    wholesale: 'Catalogue Grossiste',
    verified: 'Prix vérifiés',
    stale: 'Prix vérifiés enregistrés',
    fallback: 'Snapshot vérifié',
    searchPlaceholder: 'Rechercher SKU, produit, format…',
    searchLabel: 'Rechercher dans le catalogue',
    allCategories: 'Tous les produits',
    allLines: 'Toutes les lignes',
    standardLine: 'Standard',
    naturalLine: 'Ligne Naturelle',
    allTruffles: 'Toutes les truffes',
    white: 'Blanche',
    black: 'Noire',
    summer: "Truffe d'été",
    bianchetto: 'Bianchetto',
    mixed: 'Mixte',
    none: 'Autre',
    products: 'produits',
    categories: 'catégories',
    upToDiscount: "Jusqu'à 25% de remise volume",
    sku: 'SKU',
    product: 'Produit',
    size: 'Format',
    casePack: 'Unités/boîte',
    basePrice: 'Prix de base',
    bestPrice: 'Meilleur prix',
    cases: 'Boîtes',
    yourPrice: 'Votre prix',
    perUnit: '/ unité',
    perCase: '/ boîte',
    subtotal: 'Sous-total',
    saving: 'Économie',
    addToQuote: 'Ajouter au devis',
    updateQuote: 'Mettre à jour',
    quote: 'Devis',
    quoteTitle: 'Demande de devis',
    quoteEmpty: 'Ajoutez des produits pour préparer votre demande grossiste.',
    remove: 'Supprimer',
    close: 'Fermer',
    copyOrder: 'Copier la commande',
    copied: 'Copié',
    whatsapp: 'Envoyer sur WhatsApp',
    clearQuote: 'Vider le devis',
    total: 'Total estimé',
    exWorks: 'Prix départ usine, hors TVA et frais de port.',
    noResults: 'Aucun produit ne correspond à ces filtres.',
    resetFilters: 'Réinitialiser',
    browse: 'Voir le catalogue',
    heroEyebrow: 'House of Tartufo · B2B',
    heroTitle: 'Le catalogue grossiste conçu pour aller vite.',
    heroBody: 'Recherchez, comparez les prix par volume et préparez un devis sans quitter le catalogue.',
    sourceUpdated: 'Vérifié',
    discountTier: 'remise volume',
  },
  nl: {
    wholesale: 'Groothandel Catalogus',
    verified: 'Geverifieerde prijzen',
    stale: 'Opgeslagen geverifieerde prijzen',
    fallback: 'Geverifieerde snapshot',
    searchPlaceholder: 'Zoek SKU, product, formaat…',
    searchLabel: 'Zoek in catalogus',
    allCategories: 'Alle producten',
    allLines: 'Alle lijnen',
    standardLine: 'Standaard',
    naturalLine: 'Natuurlijn',
    allTruffles: 'Alle truffels',
    white: 'Witte',
    black: 'Zwarte',
    summer: 'Zomer',
    bianchetto: 'Bianchetto',
    mixed: 'Gemengd',
    none: 'Overig',
    products: 'producten',
    categories: 'categorieën',
    upToDiscount: 'Tot 25% volumekorting',
    sku: 'SKU',
    product: 'Product',
    size: 'Formaat',
    casePack: 'Stuks/doos',
    basePrice: 'Basisprijs',
    bestPrice: 'Beste prijs',
    cases: 'Dozen',
    yourPrice: 'Uw prijs',
    perUnit: '/ eenheid',
    perCase: '/ doos',
    subtotal: 'Subtotaal',
    saving: 'Besparing',
    addToQuote: 'Toevoegen aan offerte',
    updateQuote: 'Offerte bijwerken',
    quote: 'Offerte',
    quoteTitle: 'Offerteaanvraag',
    quoteEmpty: 'Voeg producten toe om uw groothandelsaanvraag op te bouwen.',
    remove: 'Verwijderen',
    close: 'Sluiten',
    copyOrder: 'Bestelling kopiëren',
    copied: 'Gekopieerd',
    whatsapp: 'Verstuur via WhatsApp',
    clearQuote: 'Offerte wissen',
    total: 'Geschat totaal',
    exWorks: 'Prijzen ex-works, excl. BTW en verzending.',
    noResults: 'Geen producten komen overeen met deze filters.',
    resetFilters: 'Filters wissen',
    browse: 'Catalogus bekijken',
    heroEyebrow: 'House of Tartufo · B2B',
    heroTitle: 'De groothandelscatalogus, gemaakt voor snelheid.',
    heroBody: 'Zoek, vergelijk volumeprijzen en bereid een offerte voor zonder de catalogus te verlaten.',
    sourceUpdated: 'Geverifieerd',
    discountTier: 'volumekorting',
  },
};

function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function getInitialLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch (error) {
    console.warn('[HOT Price List] Locale storage unavailable.', error);
  }

  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('it')) return 'it';
  if (browser.startsWith('fr')) return 'fr';
  if (browser.startsWith('nl')) return 'nl';
  return 'en';
}

export function setDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch (error) {
    console.warn('[HOT Price List] Could not persist locale.', error);
  }
}

export async function loadTranslations(): Promise<TranslationBundle> {
  const response = await fetch(TRANSLATIONS_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Translation snapshot returned HTTP ${response.status}.`);
  const bundle = (await response.json()) as TranslationBundle;
  for (const locale of SUPPORTED_LOCALES) {
    if (!bundle[locale] || Object.keys(bundle[locale]).length === 0) {
      throw new Error(`Translation snapshot is missing locale ${locale}.`);
    }
  }
  return bundle;
}

export function sourceText(bundle: TranslationBundle, locale: Locale, key: string): string {
  return bundle[locale][key] ?? bundle.en[key] ?? key;
}

export function uiText(locale: Locale, key: string): string {
  return PREVIEW_COPY[locale][key] ?? PREVIEW_COPY.en[key] ?? key;
}

export function categoryText(bundle: TranslationBundle, locale: Locale, categoryId: string): string {
  const key = CATEGORY_TRANSLATION_KEYS[categoryId];
  return key ? sourceText(bundle, locale, key) : categoryId;
}
