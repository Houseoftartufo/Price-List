export type CommercialQuoteLocale = 'en' | 'it' | 'fr' | 'nl';

export interface CommercialQuoteLine {
  name: string;
  size: string;
  sku: string;
  boxes: number;
  unitsPerBox: number;
  unitPrice: number;
  boxPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface CommercialQuoteMessageInput {
  locale: CommercialQuoteLocale;
  lines: CommercialQuoteLine[];
  total: number;
  saving: number;
  verifiedAtLabel?: string;
}

export interface CommercialQuoteMessages {
  whatsapp: string;
  email: string;
}

const LOCALE_CODES: Record<CommercialQuoteLocale, string> = {
  en: 'en-BE',
  it: 'it-IT',
  fr: 'fr-BE',
  nl: 'nl-BE',
};

const COPY = {
  en: {
    title: 'B2B QUOTE REQUEST',
    intro: 'Hello House of Tartufo, we would like a quotation for the following products.',
    product: (count: number) => (count === 1 ? 'product' : 'products'),
    box: (count: number) => (count === 1 ? 'box' : 'boxes'),
    unit: (count: number) => (count === 1 ? 'unit' : 'units'),
    sku: 'SKU',
    quantity: 'Quantity',
    netPrice: 'Net price',
    volumeDiscount: 'Volume discount',
    subtotal: 'Subtotal',
    summary: 'SUMMARY',
    beforeDiscount: 'Value before volume discounts',
    saving: 'Volume savings',
    total: 'Estimated total',
    exWorks: 'Prices ex-works, excluding VAT and shipping.',
    verified: 'Prices verified',
  },
  it: {
    title: 'RICHIESTA PREVENTIVO B2B',
    intro: 'Buongiorno House of Tartufo, vorremmo ricevere un preventivo per i seguenti prodotti.',
    product: (count: number) => (count === 1 ? 'prodotto' : 'prodotti'),
    box: (_count: number) => 'box',
    unit: (_count: number) => 'unità',
    sku: 'SKU',
    quantity: 'Quantità',
    netPrice: 'Prezzo netto',
    volumeDiscount: 'Sconto volume',
    subtotal: 'Subtotale',
    summary: 'RIEPILOGO',
    beforeDiscount: 'Valore prima degli sconti volume',
    saving: 'Risparmio volume',
    total: 'Totale stimato',
    exWorks: 'Prezzi ex-works, IVA e spedizione escluse.',
    verified: 'Prezzi verificati',
  },
  fr: {
    title: 'DEMANDE DE DEVIS B2B',
    intro: 'Bonjour House of Tartufo, nous souhaitons recevoir un devis pour les produits suivants.',
    product: (count: number) => (count === 1 ? 'produit' : 'produits'),
    box: (_count: number) => 'box',
    unit: (count: number) => (count === 1 ? 'unité' : 'unités'),
    sku: 'SKU',
    quantity: 'Quantité',
    netPrice: 'Prix net',
    volumeDiscount: 'Remise volume',
    subtotal: 'Sous-total',
    summary: 'RÉCAPITULATIF',
    beforeDiscount: 'Valeur avant remises volume',
    saving: 'Économie volume',
    total: 'Total estimé',
    exWorks: 'Prix ex-works, hors TVA et frais de livraison.',
    verified: 'Prix vérifiés',
  },
  nl: {
    title: 'B2B OFFERTEAANVRAAG',
    intro: 'Hallo House of Tartufo, wij ontvangen graag een offerte voor de volgende producten.',
    product: (count: number) => (count === 1 ? 'product' : 'producten'),
    box: (count: number) => (count === 1 ? 'box' : 'boxen'),
    unit: (count: number) => (count === 1 ? 'eenheid' : 'eenheden'),
    sku: 'SKU',
    quantity: 'Aantal',
    netPrice: 'Nettoprijs',
    volumeDiscount: 'Volumekorting',
    subtotal: 'Subtotaal',
    summary: 'OVERZICHT',
    beforeDiscount: 'Waarde vóór volumekorting',
    saving: 'Volumebesparing',
    total: 'Geschat totaal',
    exWorks: 'Prijzen ex-works, exclusief btw en verzending.',
    verified: 'Prijzen geverifieerd',
  },
} as const;

function money(value: number, locale: CommercialQuoteLocale): string {
  return new Intl.NumberFormat(LOCALE_CODES[locale], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round((value + 1e-9) * 100) / 100);
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function quantityLine(line: CommercialQuoteLine, locale: CommercialQuoteLocale): string {
  const t = COPY[locale];
  const totalUnits = line.boxes * line.unitsPerBox;
  return `${line.boxes} ${t.box(line.boxes)} × ${line.unitsPerBox} ${t.unit(line.unitsPerBox)} = ${totalUnits} ${t.unit(totalUnits)}`;
}

function lineTitle(line: CommercialQuoteLine): string {
  const size = clean(line.size);
  return size ? `${clean(line.name)} · ${size}` : clean(line.name);
}

function buildWhatsapp(input: CommercialQuoteMessageInput): string {
  const { locale, lines, total, saving, verifiedAtLabel } = input;
  const t = COPY[locale];
  const totalBoxes = lines.reduce((sum, line) => sum + line.boxes, 0);
  const beforeDiscount = total + saving;
  const output: string[] = [
    `*HOUSE OF TARTUFO — ${t.title}*`,
    t.intro,
    `${lines.length} ${t.product(lines.length)} · ${totalBoxes} ${t.box(totalBoxes)}`,
    '',
  ];

  lines.forEach((line, index) => {
    output.push(`*${index + 1}. ${lineTitle(line)}*`);
    output.push(`${t.sku}: ${line.sku}`);
    output.push(`${t.quantity}: ${quantityLine(line, locale)}`);
    output.push(`${t.netPrice}: ${money(line.unitPrice, locale)} / ${t.unit(1)} · ${money(line.boxPrice, locale)} / ${t.box(1)}`);
    if (line.discountPercent > 0) output.push(`${t.volumeDiscount}: *−${line.discountPercent}%*`);
    output.push(`${t.subtotal}: *${money(line.subtotal, locale)}*`);
    output.push('');
  });

  output.push(`*${t.summary}*`);
  output.push(`${t.beforeDiscount}: ${money(beforeDiscount, locale)}`);
  if (saving > 0) output.push(`${t.saving}: *−${money(saving, locale)}*`);
  output.push(`*${t.total}: ${money(total, locale)}*`);
  output.push('');
  output.push(t.exWorks);
  if (verifiedAtLabel) output.push(`${t.verified}: ${clean(verifiedAtLabel)}`);

  return output.join('\n');
}

function buildEmail(input: CommercialQuoteMessageInput): string {
  const { locale, lines, total, saving, verifiedAtLabel } = input;
  const t = COPY[locale];
  const totalBoxes = lines.reduce((sum, line) => sum + line.boxes, 0);
  const beforeDiscount = total + saving;
  const divider = '----------------------------------------';
  const output: string[] = [
    `HOUSE OF TARTUFO — ${t.title}`,
    t.intro,
    `${lines.length} ${t.product(lines.length)} · ${totalBoxes} ${t.box(totalBoxes)}`,
    '',
    divider,
  ];

  lines.forEach((line, index) => {
    output.push(`${index + 1}. ${lineTitle(line)}`);
    output.push(`${t.sku}: ${line.sku}`);
    output.push(`${t.quantity}: ${quantityLine(line, locale)}`);
    output.push(`${t.netPrice}: ${money(line.unitPrice, locale)} / ${t.unit(1)} · ${money(line.boxPrice, locale)} / ${t.box(1)}`);
    if (line.discountPercent > 0) output.push(`${t.volumeDiscount}: −${line.discountPercent}%`);
    output.push(`${t.subtotal}: ${money(line.subtotal, locale)}`);
    output.push(divider);
  });

  output.push(t.summary);
  output.push(`${t.beforeDiscount}: ${money(beforeDiscount, locale)}`);
  if (saving > 0) output.push(`${t.saving}: −${money(saving, locale)}`);
  output.push(`${t.total}: ${money(total, locale)}`);
  output.push('');
  output.push(t.exWorks);
  if (verifiedAtLabel) output.push(`${t.verified}: ${clean(verifiedAtLabel)}`);

  return output.join('\n');
}

export function buildCommercialQuoteMessages(input: CommercialQuoteMessageInput): CommercialQuoteMessages {
  return {
    whatsapp: buildWhatsapp(input),
    email: buildEmail(input),
  };
}
