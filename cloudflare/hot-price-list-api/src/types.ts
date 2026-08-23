export type Locale = 'en' | 'fr' | 'it' | 'nl' | 'de';
export type CatalogueHealth = 'READY' | 'WARNING' | 'BLOCKED';
export type AvailabilityState = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';
export type CustomerType = 'company' | 'private';
export type ContactChannel = 'whatsapp' | 'email';

export interface BillitCommercialProduct {
  productId: number;
  sku: string;
  name: string;
  amountExcl: number;
  vatRate: number;
  unit: string;
  groupId?: number;
  lastModified?: string;
}

export interface ShopifyProductEnrichment {
  productId: string;
  variantId: string;
  sku: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  inventoryQuantity?: number;
  imageUrl?: string;
  sizeLabel?: string;
  unitsPerCase?: number;
  ingredients?: string;
  storage?: string;
  usage?: string;
  localized?: Partial<Record<Locale, {
    title?: string;
    description?: string;
    ingredients?: string;
    storage?: string;
    usage?: string;
  }>>;
  updatedAt?: string;
}

export interface CanonicalProduct {
  sku: string;
  name: string;
  currency: 'EUR';
  basePriceExVat: number;
  vatRate: number;
  unit: string;
  sizeLabel?: string;
  unitsPerCase: number;
  availability: AvailabilityState;
  imageUrl?: string;
  localized?: ShopifyProductEnrichment['localized'];
  health: CatalogueHealth;
  healthReasons: string[];
  billitProductId: number;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  verifiedAt: string;
}

export interface QuoteLineInput {
  sku: string;
  cases: number;
}

export interface QuoteCustomerInput {
  type: CustomerType;
  companyName?: string;
  vatNumber?: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  email: string;
  phone: string;
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  addressLine2?: string;
}

export interface QuoteRequestInput {
  idempotencyKey: string;
  locale: Locale;
  preferredChannel: ContactChannel;
  customer: QuoteCustomerInput;
  lines: QuoteLineInput[];
}

export interface CanonicalQuoteLine {
  sku: string;
  name: string;
  cases: number;
  unitsPerCase: number;
  totalUnits: number;
  baseUnitPriceExVat: number;
  discountRate: number;
  finalUnitPriceExVat: number;
  casePriceExVat: number;
  subtotalExVat: number;
  vatRate: number;
  availability: AvailabilityState;
}

export interface CanonicalQuote {
  quoteId: string;
  status: 'ACCEPTED';
  locale: Locale;
  preferredChannel: ContactChannel;
  customer: QuoteCustomerInput;
  lines: CanonicalQuoteLine[];
  totalExVat: number;
  currency: 'EUR';
  createdAt: string;
  catalogueVerifiedAt: string;
}

export interface QuoteJob {
  quoteId: string;
  kind: 'billit' | 'attio' | 'admin';
  attempt: number;
}
