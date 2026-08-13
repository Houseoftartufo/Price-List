export type Currency = 'EUR';

export type CatalogueFreshness = 'fresh' | 'stale' | 'fallback';
export type CatalogueSource = 'google-sheet' | 'snapshot';

export type TruffleType =
  | 'white'
  | 'black'
  | 'summer'
  | 'bianchetto'
  | 'mixed'
  | 'none';

export type ProductLine = 'standard' | 'natural';

export interface Product {
  sku: string;
  categoryId: string;
  groupId: string;
  name: string;
  sizeLabel: string;
  baseUnitPrice: number;
  unitsPerCase: number;
  currency: Currency;

  truffleType?: TruffleType;
  line?: ProductLine;
  shelfLifeMonths?: number;
  percentageLabel?: string;
  flavour?: string;
  active?: boolean;
}

export interface DiscountTier {
  minCases: number;
  discountRate: number;
}

export interface CatalogueSourceMeta {
  spreadsheetId: string;
  sheet: string;
  sourceRowCount: number;
  categoryCount: number;
}

export interface Catalogue {
  schemaVersion: 1;
  catalogueVersion: string;
  currency: Currency;
  updatedAt: string;
  verifiedAt: string;
  source: CatalogueSource;
  freshness: CatalogueFreshness;
  products: Product[];
  discountPolicy: DiscountTier[];
  sourceMeta?: CatalogueSourceMeta;
}

export interface QuoteLine {
  sku: string;
  cases: number;
}

export interface PriceBreakdown {
  sku: string;
  cases: number;
  unitsPerCase: number;
  discountRate: number;
  discountPercent: number;

  baseUnitPrice: number;
  unitPrice: number;
  baseCasePrice: number;
  casePrice: number;
  baseSubtotal: number;
  subtotal: number;
  saving: number;
}
