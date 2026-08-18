import './styles/quote-format-manager.css';

import type { Product } from './catalog/types';
import { OFFICIAL_PRODUCT_VARIANTS } from './official-product-master';

export type QuoteFormatLocale = 'en' | 'it' | 'fr' | 'nl';

interface QuoteFormatVariant {
  product: string;
  size: string;
  sku: string;
}

interface QuoteFormatFamily {
  product: string;
  variants: QuoteFormatVariant[];
}

const COPY = {
  en: {
    format: 'Format',
    addAnother: 'Add another format',
    addFormat: (format: string) => `Add ${format}`,
    added: 'Added',
    unavailable: 'Unavailable',
    allAdded: 'All available formats added',
  },
  it: {
    format: 'Formato',
    addAnother: 'Aggiungi un altro formato',
    addFormat: (format: string) => `Aggiungi ${format}`,
    added: 'Aggiunto',
    unavailable: 'Non disponibile',
    allAdded: 'Tutti i formati disponibili aggiunti',
  },
  fr: {
    format: 'Format',
    addAnother: 'Ajouter un autre format',
    addFormat: (format: string) => `Ajouter ${format}`,
    added: 'Ajouté',
    unavailable: 'Indisponible',
    allAdded: 'Tous les formats disponibles sont ajoutés',
  },
  nl: {
    format: 'Formaat',
    addAnother: 'Ander formaat toevoegen',
    addFormat: (format: string) => `${format} toevoegen`,
    added: 'Toegevoegd',
    unavailable: 'Niet beschikbaar',
    allAdded: 'Alle beschikbare formaten toegevoegd',
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatSortValue(label: string): number {
  const match = label.trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)?$/);
  if (!match?.[1]) return Number.MAX_SAFE_INTEGER;
  const value = Number.parseFloat(match[1]);
  const unit = match[2] ?? '';
  if (unit === 'kg' || unit === 'l') return value * 1000;
  if (unit === 'cl') return value * 10;
  return value;
}

export function quoteFormatDisplayLabel(label: string): string {
  const match = label.trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(ml|g)$/);
  if (!match?.[1] || !match[2]) return label;
  const value = Number.parseFloat(match[1]);
  if (value >= 1000 && value % 1000 === 0) {
    const converted = value / 1000;
    return match[2] === 'ml' ? `${converted}L` : `${converted}kg`;
  }
  return label;
}

const familyBySku = new Map<string, QuoteFormatFamily>();
const grouped = new Map<string, QuoteFormatVariant[]>();
for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
  const variants = grouped.get(entry.product) ?? [];
  variants.push({ product: entry.product, size: entry.size, sku: entry.sku });
  grouped.set(entry.product, variants);
}
for (const [product, variants] of grouped) {
  const family: QuoteFormatFamily = {
    product,
    variants: [...variants].sort((left, right) => formatSortValue(left.size) - formatSortValue(right.size)),
  };
  for (const variant of family.variants) familyBySku.set(variant.sku, family);
}

export function quoteFormatFamilyForSku(sku: string): QuoteFormatFamily | undefined {
  return familyBySku.get(sku);
}

function isOrderable(product: Product | undefined): boolean {
  return Boolean(
    product
    && product.active !== false
    && product.orderStatus !== 'standby'
    && Number.isFinite(product.baseUnitPrice)
    && product.baseUnitPrice > 0
    && Number.isInteger(product.unitsPerCase)
    && product.unitsPerCase > 0,
  );
}

export function renderQuoteFormatTools(input: {
  sku: string;
  locale: QuoteFormatLocale;
  products: readonly Product[];
  quoteSkus: ReadonlySet<string>;
}): string {
  const { sku, locale, products, quoteSkus } = input;
  const currentProduct = products.find((product) => product.sku === sku);
  if (!currentProduct) return '';

  const t = COPY[locale];
  const family = familyBySku.get(sku);
  const currentLabel = quoteFormatDisplayLabel(currentProduct.sizeLabel);
  if (!family || family.variants.length <= 1) {
    return `<div class="quote-format-tools" data-quote-format-tools="${escapeHtml(sku)}">
      <div class="quote-format-field quote-format-field-static">
        <span>${escapeHtml(t.format)}</span>
        <strong class="quote-format-static">${escapeHtml(currentLabel)}</strong>
      </div>
    </div>`;
  }

  const productBySku = new Map(products.map((product) => [product.sku, product] as const));
  const optionMarkup = family.variants
    .map((variant) => {
      const product = productBySku.get(variant.sku);
      const selected = variant.sku === sku;
      const alreadyAdded = !selected && quoteSkus.has(variant.sku);
      const unavailable = !selected && !isOrderable(product);
      const disabled = alreadyAdded || unavailable;
      const suffix = alreadyAdded ? ` · ${t.added}` : unavailable ? ` · ${t.unavailable}` : '';
      return `<option value="${escapeHtml(variant.sku)}"${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(quoteFormatDisplayLabel(variant.size))}${escapeHtml(suffix)}</option>`;
    })
    .join('');

  const addable = family.variants.filter((variant) => {
    if (variant.sku === sku || quoteSkus.has(variant.sku)) return false;
    return isOrderable(productBySku.get(variant.sku));
  });

  const addAnotherMarkup = addable.length > 0
    ? `<details class="quote-add-format" data-quote-add-format>
        <summary><span aria-hidden="true">＋</span>${escapeHtml(t.addAnother)}</summary>
        <div class="quote-format-options" role="group" aria-label="${escapeHtml(t.addAnother)}">
          ${addable
            .map((variant) => {
              const label = quoteFormatDisplayLabel(variant.size);
              return `<button type="button" data-quote-add-format-sku="${escapeHtml(variant.sku)}" aria-label="${escapeHtml(t.addFormat(label))}">${escapeHtml(label)}</button>`;
            })
            .join('')}
        </div>
      </details>`
    : `<span class="quote-format-complete">${escapeHtml(t.allAdded)}</span>`;

  return `<div class="quote-format-tools" data-quote-format-tools="${escapeHtml(sku)}" data-product-family="${escapeHtml(family.product)}">
    <label class="quote-format-field">
      <span>${escapeHtml(t.format)}</span>
      <span class="quote-format-select-shell">
        <select data-quote-format-select data-from-sku="${escapeHtml(sku)}" aria-label="${escapeHtml(t.format)}">
          ${optionMarkup}
        </select>
      </span>
    </label>
    ${addAnotherMarkup}
  </div>`;
}
