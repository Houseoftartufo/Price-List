export type OfficialPackStatus = 'resolved' | 'missing' | 'conflict' | 'ambiguous';

export interface OfficialProductVariant {
  product: string;
  size: string;
  ingredients: string;
  aliases: readonly string[];
  packStatus: OfficialPackStatus;
  unitsPerCase?: number;
  sku?: string;
  shopifyHandle?: string;
  shopifyImage?: string;
}

export const OFFICIAL_PRODUCT_VARIANTS: readonly OfficialProductVariant[] = [
  {
    "product": "BLACK TRUFFLE SAUCE 10%",
    "size": "500 g",
    "ingredients": "Cultivated champignon mushrooms (Agaricus bisporus), sunflower seed oil, summer truffle 10% (Tuber aestivum, Vittad.), black olives, salt, flavouring, garlic, parsley.",
    "aliases": ["black truffle sauce 10%", "truffled sauce summer truffle 10%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174332",
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "BLACK TRUFFLE SAUCE 10%",
    "size": "170 g",
    "ingredients": "Cultivated champignon mushrooms (Agaricus bisporus), sunflower seed oil, summer truffle 10% (Tuber aestivum, Vittad.), black olives, salt, flavouring, garlic, parsley.",
    "aliases": ["black truffle sauce 10%", "truffled sauce summer truffle 10%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "BLACK TRUFFLE SAUCE 10%",
    "size": "80 g",
    "ingredients": "Cultivated champignon mushrooms (Agaricus bisporus), sunflower seed oil, summer truffle 10% (Tuber aestivum, Vittad.), black olives, salt, flavouring, garlic, parsley.",
    "aliases": ["black truffle sauce 10%", "truffled sauce summer truffle 10%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174318",
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "BLACK TRUFFLE SAUCE 5 %",
    "size": "500 g",
    "ingredients": "Cultivated button mushrooms (Psalliota Hortensis) 85%, extra virgin olive oil, salt, truffle purée (Tuber Aestivum vitt) 5%, black olives, flavourings, vegetable charcoal.",
    "aliases": ["black truffle sauce 5%", "truffled sauce summer truffle 5%"],
    "packStatus": "conflict",
    "sku": "5430004174127",
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "BLACK TRUFFLE SAUCE 5 %",
    "size": "170 g",
    "ingredients": "Cultivated button mushrooms (Psalliota Hortensis) 85%, extra virgin olive oil, salt, truffle purée (Tuber Aestivum vitt) 5%, black olives, flavourings, vegetable charcoal.",
    "aliases": ["black truffle sauce 5%", "truffled sauce summer truffle 5%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174110",
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "BLACK TRUFFLE SAUCE 5 %",
    "size": "80 g",
    "ingredients": "Cultivated button mushrooms (Psalliota Hortensis) 85%, extra virgin olive oil, salt, truffle purée (Tuber Aestivum vitt) 5%, black olives, flavourings, vegetable charcoal.",
    "aliases": ["black truffle sauce 5%", "truffled sauce summer truffle 5%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174103",
    "shopifyHandle": "black-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/04.1_Black_Truffle_Sauce.webp?v=1736518396"
  },
  {
    "product": "WHITE TRUFFLE SAUCE",
    "size": "500 g",
    "ingredients": "Champignon mushrooms (Agaricus bisporus), olive oil, natural fiber, Bianchetto truffle (Tuber borchii Vitt.) min. 2% (origin: Italy), garlic, salt, flavours.",
    "aliases": ["white truffle sauce", "white truffled sauce bianchetto truffle 2%"],
    "packStatus": "conflict",
    "sku": "5430004174240",
    "shopifyHandle": "white-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/05.1_White_Truffle_Sauce.webp?v=1736517835"
  },
  {
    "product": "WHITE TRUFFLE SAUCE",
    "size": "170 g",
    "ingredients": "Champignon mushrooms (Agaricus bisporus), olive oil, natural fiber, Bianchetto truffle (Tuber borchii Vitt.) min. 2% (origin: Italy), garlic, salt, flavours.",
    "aliases": ["white truffle sauce", "white truffled sauce bianchetto truffle 2%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174134",
    "shopifyHandle": "white-truffle-sauce",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/05.1_White_Truffle_Sauce.webp?v=1736517835"
  },
  {
    "product": "BLACK TRUFFLE MAYONNAISE",
    "size": "120 g",
    "ingredients": "Sunflower seed oil, pasteurised EGG, wine vinegar, extra virgin olive oil, summer truffle (Tuber aestivum Vitt.), salt, flavouring.",
    "aliases": ["black truffle mayonnaise", "truffle mayonnaise"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "TRUFFLED KETCHUP",
    "size": "85 g",
    "ingredients": "Tomato (148 g per 100 g of product), spirit vinegar, summer truffle (Tuber aestivum Vitt.) 1%, sugar, salt, spices and aromatic herb extracts (contains CELERY), spices, flavouring.",
    "aliases": ["truffled ketchup", "truffle ketchup"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "TRUFFLED KETCHUP",
    "size": "30 g",
    "ingredients": "Tomato (148 g per 100 g of product), spirit vinegar, summer truffle (Tuber aestivum Vitt.) 1%, sugar, salt, spices and aromatic herb extracts (contains CELERY), spices, flavouring.",
    "aliases": ["truffled ketchup", "truffle ketchup"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "PORCINI MUSHROOMS CREAMS WITH SUMMER TRUFFLES",
    "size": "180 g",
    "ingredients": "Porcini mushrooms (Boletus edulis), summer black truffle (Tuber aestivum Vitt.) 5%, extra virgin olive oil, salt, pepper, parsley, flavouring.",
    "aliases": ["porcini mushroom cream with summer truffle", "porcini mushrooms cream with summer truffles"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "PORCINI MUSHROOMS CREAMS WITH SUMMER TRUFFLES",
    "size": "80 g",
    "ingredients": "Porcini mushrooms (Boletus edulis), summer black truffle (Tuber aestivum Vitt.) 5%, extra virgin olive oil, salt, pepper, parsley, flavouring.",
    "aliases": ["porcini mushroom cream with summer truffle", "porcini mushrooms cream with summer truffles"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "SUMMER TRUFFLE CARPACCIO",
    "size": "500 g",
    "ingredients": "Summer truffle (Tuber aestivum, Vittad.) 60%, water, flavouring.",
    "aliases": ["summer truffle carpaccio"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "summer-truffle-carpaccio",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960"
  },
  {
    "product": "SUMMER TRUFFLE CARPACCIO",
    "size": "170 g",
    "ingredients": "Summer truffle (Tuber aestivum, Vittad.) 60%, water, flavouring.",
    "aliases": ["summer truffle carpaccio"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "summer-truffle-carpaccio",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960"
  },
  {
    "product": "SUMMER TRUFFLE CARPACCIO",
    "size": "80 g",
    "ingredients": "Summer truffle (Tuber aestivum, Vittad.) 60%, water, flavouring.",
    "aliases": ["summer truffle carpaccio"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "summer-truffle-carpaccio",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960"
  },
  {
    "product": "SUMMER TRUFFLE CARPACCIO",
    "size": "45 g",
    "ingredients": "Summer truffle (Tuber aestivum, Vittad.) 60%, water, flavouring.",
    "aliases": ["summer truffle carpaccio"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "summer-truffle-carpaccio",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/01.1_Black_Truffle_Carpaccio_453cca1d-897e-46b5-8aab-ad7a819d3a47.webp?v=1736778960"
  },
  {
    "product": "BLACK TRUFFLE BUTTER",
    "size": "450 g",
    "ingredients": "BUTTER (LACTOSE), summer truffle (Tuber aestivum, Vittad.) 3%, salt, flavouring.",
    "aliases": ["black truffle butter", "butter with summer truffle 3%"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "BLACK TRUFFLE BUTTER",
    "size": "160 g",
    "ingredients": "BUTTER (LACTOSE), summer truffle (Tuber aestivum, Vittad.) 3%, salt, flavouring.",
    "aliases": ["black truffle butter", "butter with summer truffle 3%"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "BLACK TRUFFLE BUTTER",
    "size": "80 g",
    "ingredients": "BUTTER (LACTOSE), summer truffle (Tuber aestivum, Vittad.) 3%, salt, flavouring.",
    "aliases": ["black truffle butter", "butter with summer truffle 3%"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "WHITE TRUFFLE BUTTER",
    "size": "450 g",
    "ingredients": "BUTTER (LACTOSE), bianchetto truffle (Tuber borchii, Vittad.) 6%, salt, flavouring.",
    "aliases": ["white truffle butter", "butter with bianchetto truffle 6%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "white-truffle-butter",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836"
  },
  {
    "product": "WHITE TRUFFLE BUTTER",
    "size": "160 g",
    "ingredients": "BUTTER (LACTOSE), bianchetto truffle (Tuber borchii, Vittad.) 6%, salt, flavouring.",
    "aliases": ["white truffle butter", "butter with bianchetto truffle 6%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "white-truffle-butter",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836"
  },
  {
    "product": "WHITE TRUFFLE BUTTER",
    "size": "80 g",
    "ingredients": "BUTTER (LACTOSE), bianchetto truffle (Tuber borchii, Vittad.) 6%, salt, flavouring.",
    "aliases": ["white truffle butter", "butter with bianchetto truffle 6%"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "white-truffle-butter",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/11.1_White_Truffle_Butter.webp?v=1736517836"
  },
  {
    "product": "TRUFFLE CASHEW",
    "size": "80 g",
    "ingredients": "Toasted shelled CASHEWS 92.5%; sunflower oil 5%; [salt, summer truffle (Tuber aestivum Vitt.) 1%, flavourings] 2.5%.",
    "aliases": ["truffle cashew", "truffle cashews"],
    "packStatus": "resolved",
    "unitsPerCase": 16
  },
  {
    "product": "TRUFFLE ALMONDS",
    "size": "80 g",
    "ingredients": "Toasted shelled ALMONDS 92.5%; sunflower oil 5%; [salt, summer truffle (Tuber aestivum Vitt.) 1%, flavourings] 2.5%.",
    "aliases": ["truffle almond", "truffle almonds"],
    "packStatus": "resolved",
    "unitsPerCase": 16
  },
  {
    "product": "TRUFFLE WALNUTS",
    "size": "80 g",
    "ingredients": "Toasted shelled WALNUTS 95%; sunflower oil 3.4%; [salt, summer truffle (Tuber aestivum Vitt.) 1%, flavourings] 1.6%.",
    "aliases": ["truffle walnut", "truffle walnuts"],
    "packStatus": "resolved",
    "unitsPerCase": 16
  },
  {
    "product": "SALT WITH SUMMER TRUFFLE",
    "size": "120 g",
    "ingredients": "Salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.",
    "aliases": ["salt with summer truffle", "sea salt with summer truffle"],
    "packStatus": "missing"
  },
  {
    "product": "SALT WITH SUMMER TRUFFLE",
    "size": "30 g",
    "ingredients": "Salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.",
    "aliases": ["salt with summer truffle", "sea salt with summer truffle"],
    "packStatus": "missing"
  },
  {
    "product": "SALT WITH WHITE TRUFFLE",
    "size": "120 g",
    "ingredients": "Grey salt, dried white truffle (Tuber magnatum, Pico.) 1%, flavouring. .",
    "aliases": ["salt with white truffle", "sea salt with white truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "SALT WITH WHITE TRUFFLE",
    "size": "30 g",
    "ingredients": "Grey salt, dried white truffle (Tuber magnatum, Pico.) 1%, flavouring. .",
    "aliases": ["salt with white truffle", "sea salt with white truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "GREY SALT WITH TRUFFLE",
    "size": "100 g",
    "ingredients": "Grey salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.",
    "aliases": ["grey salt with truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "HIMALAYAN PINK SALT WITH TRUFFLE",
    "size": "100 g",
    "ingredients": "Himalayan pink salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.",
    "aliases": ["himalayan pink salt with truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "SPICY TRUFFLE SAUCE",
    "size": "180 g",
    "ingredients": "Champignon mushrooms, summer black truffle (Tuber aestivum Vitt.), extra virgin olive oil, black olives, paprika, hot chilli pepper, truffle flavourings, salt, parsley.",
    "aliases": ["spicy truffle sauce"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "SPICY TRUFFLE SAUCE",
    "size": "80 g",
    "ingredients": "Champignon mushrooms, summer black truffle (Tuber aestivum Vitt.), extra virgin olive oil, black olives, paprika, hot chilli pepper, truffle flavourings, salt, parsley.",
    "aliases": ["spicy truffle sauce"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "POLENTA WITH SUMMER TRUFFLE",
    "size": "125 g",
    "ingredients": "Corn flour, buckwheat flour, flavouring, dried summer truffle (Tuber aestivum, Vitt.) 0.2%.",
    "aliases": ["polenta with summer truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "RISOTTO WITH SUMMER TRUFFLE",
    "size": "300 g",
    "ingredients": "Carnaroli rice, dried mushrooms (Agaricus bisporus), dried summer truffle (Tuber aestivum, Vitt.) 0.3%, flavouring.",
    "aliases": ["risotto with summer truffle", "truffle risotto"],
    "packStatus": "resolved",
    "unitsPerCase": 24
  },
  {
    "product": "RISOTTO WITH SUMMER TRUFFLE",
    "size": "170 g",
    "ingredients": "Carnaroli rice, dried mushrooms (Agaricus bisporus), dried summer truffle (Tuber aestivum, Vitt.) 0.3%, flavouring.",
    "aliases": ["risotto with summer truffle", "truffle risotto"],
    "packStatus": "resolved",
    "unitsPerCase": 24
  },
  {
    "product": "WHITE TRUFFLE GENOVESE PESTO",
    "size": "80 g",
    "ingredients": "Olive oil, Genovese basil, CASHEWS, extra virgin olive oil, salt, pine nuts, white truffle (Tuber magnatum Pico), flavouring.",
    "aliases": ["white truffle genovese pesto", "genovese pesto"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "sku": "5430004174509",
    "shopifyHandle": "genovese-pesto"
  },
  {
    "product": "ACACIA HONEY WITH TRUFFLE",
    "size": "450 g",
    "ingredients": "Acacia honey, bianchetto truffle (Tuber borchii Vitt.) 0.5% (2% originally), flavouring.",
    "aliases": ["acacia honey with truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 6
  },
  {
    "product": "ACACIA HONEY WITH TRUFFLE",
    "size": "220 g",
    "ingredients": "Acacia honey, bianchetto truffle (Tuber borchii Vitt.) 0.5% (2% originally), flavouring.",
    "aliases": ["acacia honey with truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "ACACIA HONEY WITH TRUFFLE",
    "size": "110 g",
    "ingredients": "Acacia honey, bianchetto truffle (Tuber borchii Vitt.) 0.5% (2% originally), flavouring.",
    "aliases": ["acacia honey with truffle"],
    "packStatus": "resolved",
    "unitsPerCase": 12
  },
  {
    "product": "ACETO BALSAMICO DI MODENA",
    "size": "100 ml",
    "ingredients": "Concentrated grape must, Balsamic Vinegar of Modena PGI (wine vinegar, concentrated grape must, colour E150d), wine vinegar, colour E150d, flavouring. Contains SULPHITES.",
    "aliases": ["aceto balsamico di modena", "balsamic vinegar of modena"],
    "packStatus": "ambiguous"
  },
  {
    "product": "WHITE TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "60 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["white truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "parfumed-white-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "WHITE TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "100 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["white truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "parfumed-white-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "WHITE TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "250 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["white truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "parfumed-white-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "WHITE TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "1 L",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["white truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 6,
    "shopifyHandle": "parfumed-white-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "WHITE TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "5 L",
    "ingredients": "Extra virgin olive oil min. 99% (origin: EU), white truffle natural extract (Tuber magnatum Pico) (origin: Italy) min. 0.02%, flavours.",
    "aliases": ["white truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 4,
    "shopifyHandle": "parfumed-white-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/08.1_White_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "BLACK TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "60 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["black truffle extra virgin olive oil"],
    "packStatus": "missing",
    "shopifyHandle": "black-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "BLACK TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "100 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["black truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "black-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "BLACK TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "250 ml",
    "ingredients": "Extra virgin olive oil, flavouring",
    "aliases": ["black truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 12,
    "shopifyHandle": "black-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835"
  },
  {
    "product": "BLACK TRUFFLE EXTRA-VIRGIN OLIVE OIL",
    "size": "5 L",
    "ingredients": "Extra virgin olive oil min. 99% (origin: EU), natural black truffle extract (Tuber melanosporum Vitt.) (origin: Italy) min. 0.02%, flavours.",
    "aliases": ["black truffle extra virgin olive oil"],
    "packStatus": "resolved",
    "unitsPerCase": 4,
    "shopifyHandle": "black-truffle-extra-virgin-olive-oil",
    "shopifyImage": "https://cdn.shopify.com/s/files/1/0791/6126/2407/files/07.1_Black_Truffle_Olive_Oil.webp?v=1736517835"
  }
] as const;

function compact(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalise(value: string): string {
  return compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bextra[- ]virgin\b/g, ' extra virgin ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function measureKey(value: string): string | undefined {
  const text = compact(value).toLowerCase().replace(',', '.');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|l)\b/);
  if (!match?.[1] || !match[2]) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  const unit = match[2] === 'gr' ? 'g' : match[2];
  if (unit === 'kg') return `${Math.round(amount * 1000)}g`;
  if (unit === 'l') return `${Math.round(amount * 1000)}ml`;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${unit}`;
}

export function findOfficialProductVariant(name: string, size: string): OfficialProductVariant | undefined {
  const wantedName = normalise(name);
  const wantedSize = measureKey(size);
  if (!wantedName || !wantedSize) return undefined;

  const candidates = OFFICIAL_PRODUCT_VARIANTS.filter((entry) => {
    if (measureKey(entry.size) !== wantedSize) return false;
    return entry.aliases.some((alias) => {
      const candidate = normalise(alias);
      return wantedName === candidate || wantedName.includes(candidate) || candidate.includes(wantedName);
    });
  });

  return candidates.length === 1 ? candidates[0] : undefined;
}

export const OFFICIAL_MASTER_COUNTS = {
  variants: OFFICIAL_PRODUCT_VARIANTS.length,
  families: new Set(OFFICIAL_PRODUCT_VARIANTS.map((entry) => entry.product)).size,
  withResolvedPack: OFFICIAL_PRODUCT_VARIANTS.filter((entry) => entry.packStatus === 'resolved').length,
  withOfficialSku: OFFICIAL_PRODUCT_VARIANTS.filter((entry) => Boolean(entry.sku)).length,
} as const;
