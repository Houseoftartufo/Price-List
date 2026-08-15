import { OFFICIAL_PRODUCT_VARIANTS_CHUNK_1 } from './official-product-master-data-1';
import { OFFICIAL_PRODUCT_VARIANTS_CHUNK_2 } from './official-product-master-data-2';
import { OFFICIAL_PRODUCT_VARIANTS_CHUNK_3 } from './official-product-master-data-3';
import { OFFICIAL_PRODUCT_VARIANTS_CHUNK_4 } from './official-product-master-data-4';

export type ShopifyProductStatus = 'active' | 'draft' | 'archived';

export interface OfficialNutrition {
  energyKj?: number;
  energyKcal?: number;
  fat?: number;
  saturates?: number;
  carbohydrates?: number;
  sugars?: number;
  protein?: number;
  salt?: number;
  fibre?: number;
}

export interface OfficialShopifyReference {
  productId: string;
  status: ShopifyProductStatus;
  handle: string;
  publicHandle?: string;
}

export interface OfficialProductVariant {
  product: string;
  sourceName: string;
  size: string;
  sku: string;
  barcode: string;
  family: string;
  shelfLife: string;
  unitsPerCase: number;
  categoryType: string;
  ingredients: string;
  usage: string;
  storage: string;
  origin: string;
  allergens: string;
  nutrition: OfficialNutrition;
  technicalSheetDate?: string;
  aliases: readonly string[];
  shopify?: OfficialShopifyReference;
}

export const OFFICIAL_PRODUCT_VARIANTS: readonly OfficialProductVariant[] = [
  ...OFFICIAL_PRODUCT_VARIANTS_CHUNK_1,
  ...OFFICIAL_PRODUCT_VARIANTS_CHUNK_2,
  ...OFFICIAL_PRODUCT_VARIANTS_CHUNK_3,
  ...OFFICIAL_PRODUCT_VARIANTS_CHUNK_4,
];

export const OFFICIAL_MASTER_COUNTS = {
  variants: OFFICIAL_PRODUCT_VARIANTS.length,
  families: new Set(OFFICIAL_PRODUCT_VARIANTS.map((entry) => entry.product)).size,
  withSku: OFFICIAL_PRODUCT_VARIANTS.filter((entry) => Boolean(entry.sku)).length,
  withBarcode: OFFICIAL_PRODUCT_VARIANTS.filter((entry) => Boolean(entry.barcode)).length,
  withCasePack: OFFICIAL_PRODUCT_VARIANTS.filter((entry) => Number.isInteger(entry.unitsPerCase) && entry.unitsPerCase > 0).length,
} as const;
