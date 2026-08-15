export interface OfficialShopifyMapping {
  handle: string;
  siteSku: string;
  image: string;
}

// Verified public Shopify fallbacks only. Draft/new variants are intentionally
// excluded here and are enriched through the server-side Shopify Admin API.
export const OFFICIAL_SHOPIFY_MAP: Readonly<Record<string, OfficialShopifyMapping>> = {
  'truffled sauce summer truffle 5%|80g': {
    handle: 'black-truffle-sauce', siteSku: '5430004174103',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },
  'truffled sauce summer truffle 5%|170g': {
    handle: 'black-truffle-sauce', siteSku: '5430004174110',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },
  'truffled sauce summer truffle 5%|500g': {
    handle: 'black-truffle-sauce', siteSku: '5430004174127',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },
  'truffled sauce summer truffle 10%|80g': {
    handle: 'black-truffle-sauce', siteSku: '5430004174318',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },
  'truffled sauce summer truffle 10%|500g': {
    handle: 'black-truffle-sauce', siteSku: '5430004174332',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396',
  },

  'tartufata white sauce with bianchetto 2%|170g': {
    handle: 'white-truffle-sauce', siteSku: '5430004174134',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/05.1_White_Truffle_Sauce.webp?v=1736517835',
  },
  'tartufata white sauce with bianchetto 2%|500g': {
    handle: 'white-truffle-sauce', siteSku: '5430004174240',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/05.1_White_Truffle_Sauce.webp?v=1736517835',
  },

  'butter with bianchetto truffle 6%|80g': {
    handle: 'white-truffle-butter', siteSku: '5430004174486',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836',
  },
  'butter with bianchetto truffle 6%|160g': {
    handle: 'white-truffle-butter', siteSku: '5430004174141',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836',
  },
  'butter with bianchetto truffle 6%|450g': {
    handle: 'white-truffle-butter', siteSku: '5430004174264',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836',
  },

  'summer truffle carpaccio|45g': {
    handle: 'summer-truffle-carpaccio', siteSku: '5430004174417',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960',
  },
  'summer truffle carpaccio|80g': {
    handle: 'summer-truffle-carpaccio', siteSku: '5430004174387',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960',
  },
  'summer truffle carpaccio|170g': {
    handle: 'summer-truffle-carpaccio', siteSku: '5430004174424',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960',
  },
  'summer truffle carpaccio|500g': {
    handle: 'summer-truffle-carpaccio', siteSku: '5430004174370',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960',
  },

  'white truffle extra virgin olive oil|100ml': {
    handle: 'parfumed-white-truffle-extra-virgin-olive-oil', siteSku: '5430004174493',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835',
  },
  'white truffle extra virgin olive oil|250ml': {
    handle: 'parfumed-white-truffle-extra-virgin-olive-oil', siteSku: '5430004174547',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835',
  },
  'white truffle extra virgin olive oil|1000ml': {
    handle: 'parfumed-white-truffle-extra-virgin-olive-oil', siteSku: '5430004174448',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835',
  },
  'white truffle extra virgin olive oil|5000ml': {
    handle: 'parfumed-white-truffle-extra-virgin-olive-oil', siteSku: '5430004174035',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835',
  },

  'black truffle extra virgin olive oil|100ml': {
    handle: 'black-truffle-extra-virgin-olive-oil', siteSku: '5430004174530',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835',
  },
  'black truffle extra virgin olive oil|250ml': {
    handle: 'black-truffle-extra-virgin-olive-oil', siteSku: '5430004174455',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835',
  },
  'black truffle extra virgin olive oil|5000ml': {
    handle: 'black-truffle-extra-virgin-olive-oil', siteSku: '5430004174028',
    image: 'https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835',
  },
};
