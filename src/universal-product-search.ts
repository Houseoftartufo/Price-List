import { OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from './official-product-master';

export interface UniversalSearchHit {
  sku: string;
  product: string;
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'al', 'alla', 'alle', 'con', 'da', 'de', 'del', 'della', 'di', 'e', 'il', 'la', 'le', 'lo', 'per',
  'and', 'for', 'of', 'the', 'with',
  'a', 'au', 'aux', 'avec', 'de', 'des', 'du', 'et', 'la', 'le', 'les', 'pour',
  'de', 'en', 'het', 'met', 'van', 'voor',
  'der', 'die', 'das', 'mit', 'und', 'von', 'zu',
  'con', 'de', 'del', 'la', 'el', 'para', 'y',
  'com', 'da', 'de', 'do', 'e', 'para',
  'i', 'z', 'ze', 'do', 'na', 'oraz',
]);

const CONCEPT_ALIASES: Record<string, readonly string[]> = {
  truffle: [
    'truffle', 'truffles', 'tartufo', 'tartufi', 'truffe', 'truffes', 'truffel', 'truffels', 'trüffel',
    'trufa', 'trufas', 'trufla', 'trufle', 'трюфель', 'трюфели', 'كمأة', 'كماة', '松露', 'トリュフ',
  ],
  sauce: [
    'sauce', 'sauces', 'salsa', 'salse', 'saus', 'sauzen', 'soße', 'sosse', 'saucen', 'salsas', 'molho', 'molhos',
    'sos', 'sosy', 'соус', 'соусы', 'صلصة', 'صوص', '酱', '醬', 'ソース',
  ],
  cream: ['cream', 'crema', 'crème', 'creme', 'room', 'krem', 'крем', 'كريمة', 'クリーム', '奶油酱'],
  oil: [
    'oil', 'olive oil', 'olio', 'olio di oliva', 'huile', 'huile olive', 'olie', 'olijfolie', 'öl', 'olivenöl', 'olivenol',
    'aceite', 'aceite de oliva', 'azeite', 'olej', 'oliwa', 'масло', 'زيت', 'زيت زيتون', 'オイル', 'オリーブオイル', '油', '橄榄油',
  ],
  butter: ['butter', 'burro', 'beurre', 'boter', 'mantequilla', 'manteiga', 'masło', 'maslo', 'масло сливочное', 'زبدة', 'バター', '黄油'],
  honey: ['honey', 'miele', 'miel', 'honing', 'honig', 'mel', 'miód', 'miod', 'мед', 'عسل', 'はちみつ', '蜂蜜'],
  salt: ['salt', 'sale', 'sel', 'zout', 'salz', 'sal', 'sól', 'sol', 'соль', 'ملح', '塩', '盐'],
  vinegar: ['vinegar', 'aceto', 'vinaigre', 'azijn', 'essig', 'vinagre', 'ocet', 'уксус', 'خل', '酢', '醋'],
  balsamic: ['balsamic', 'balsamico', 'balsamique', 'balsamiczny', 'бальзамический', 'بلسمي', 'バルサミコ', '香醋'],
  carpaccio: ['carpaccio', 'carpacio', 'карпаччо', 'カルパッチョ', '卡帕乔'],
  mushroom: ['mushroom', 'mushrooms', 'fungo', 'funghi', 'champignon', 'champignons', 'paddenstoel', 'paddenstoelen', 'pilz', 'pilze', 'seta', 'setas', 'cogumelo', 'cogumelos', 'grzyb', 'grzyby', 'гриб', 'грибы', 'فطر', 'きのこ', '蘑菇'],
  porcini: ['porcini', 'porcino', 'cèpes', 'cepes', 'eekhoorntjesbrood', 'steinpilz', 'boletus', 'prawdziwek', 'боровик', 'ポルチーニ', '牛肝菌'],
  mayonnaise: ['mayonnaise', 'mayo', 'maionese', 'mayonaise', 'mayonnaisesaus', 'mayonesa', 'majonez', 'майонез', 'مايونيز', 'マヨネーズ', '蛋黄酱'],
  ketchup: ['ketchup', 'кетчуп', 'كاتشب', 'ケチャップ', '番茄酱'],
  pesto: ['pesto', 'песто', 'بيستو', 'ペスト', '青酱'],
  risotto: ['risotto', 'ризотто', 'ريزوتو', 'リゾット', '意式烩饭'],
  polenta: ['polenta', 'полента', 'بولينتا', 'ポレンタ', '玉米糊'],
  cashew: ['cashew', 'cashews', 'anacardo', 'anacardi', 'noix de cajou', 'cashewnoot', 'cashewnoten', 'cashewkerne', 'caju', 'nerkowiec', 'орех кешью', 'كاجو', 'カシューナッツ', '腰果'],
  almond: ['almond', 'almonds', 'mandorla', 'mandorle', 'amande', 'amandes', 'amandel', 'amandelen', 'mandel', 'mandeln', 'almendra', 'amêndoa', 'amendoa', 'migdał', 'migdal', 'миндаль', 'لوز', 'アーモンド', '杏仁'],
  walnut: ['walnut', 'walnuts', 'noce', 'noci', 'noix', 'walnoot', 'walnoten', 'walnuss', 'walnüsse', 'nuez', 'noz', 'orzech włoski', 'orzech wloski', 'грецкий орех', 'جوز', 'くるみ', '核桃'],
  spicy: ['spicy', 'hot', 'piccante', 'épicé', 'epice', 'pittig', 'scharf', 'picante', 'pikantny', 'острый', 'حار', '辛い', '辣'],
  pearls: ['pearls', 'perle', 'perles', 'parels', 'perlen', 'perlas', 'pérolas', 'perolas', 'perły', 'perly', 'жемчужины', 'لؤلؤ', 'パール', '珍珠'],
  spray: ['spray', 'spruzzo', 'sprüh', 'спрей', 'رذاذ', 'スプレー', '喷雾'],
  white: ['white', 'bianco', 'bianca', 'blanc', 'blanche', 'wit', 'witte', 'weiß', 'weiss', 'weiße', 'blanco', 'blanca', 'branco', 'branca', 'biały', 'bialy', 'biała', 'biala', 'белый', 'белая', 'أبيض', 'بيضاء', '白', '白い'],
  black: ['black', 'nero', 'nera', 'noir', 'noire', 'zwart', 'zwarte', 'schwarz', 'schwarze', 'negro', 'negra', 'preto', 'preta', 'czarny', 'czarna', 'черный', 'чёрный', 'أسود', 'سوداء', '黒', '黑'],
  summer: ['summer', 'estivo', 'estiva', 'estate', 'été', 'ete', 'zomer', 'sommer', 'verano', 'verão', 'verao', 'letni', 'летний', 'صيفي', '夏', 'サマー'],
  bianchetto: ['bianchetto', 'bianchetti', 'borchii', 'tuber borchii', 'marzuolo'],
  whiteTruffle: ['white truffle', 'tartufo bianco', 'truffe blanche', 'witte truffel', 'weißer trüffel', 'weisser truffel', 'trufa blanca', 'trufa branca', 'biała trufla', 'biala trufla', 'белый трюфель', 'كمأة بيضاء', '白トリュフ', '白松露'],
  blackTruffle: ['black truffle', 'tartufo nero', 'truffe noire', 'zwarte truffel', 'schwarzer trüffel', 'schwarzer truffel', 'trufa negra', 'trufa preta', 'czarna trufla', 'черный трюфель', 'كمأة سوداء', '黒トリュフ', '黑松露'],
};

function normalizeUnits(value: string): string {
  return value
    .replace(/(\d+)\s*(?:gr|grammi|grammes|grams?)\b/gu, '$1g')
    .replace(/(\d+)\s*g\b/gu, '$1g')
    .replace(/(\d+)\s*ml\b/gu, '$1ml')
    .replace(/(\d+)\s*(?:litri|litres|liters?|ltr|lt)\b/gu, '$1l')
    .replace(/(\d+)\s*l\b/gu, '$1l');
}

export function normalizeSearchText(value: string): string {
  return normalizeUnits(
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('en')
      .replace(/[^\p{L}\p{N}%]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous: number[] = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = previous[j] ?? j;
      const deletion = (previous[j] ?? j) + 1;
      const insertion = (previous[j - 1] ?? j - 1) + 1;
      const substitution = diagonal + (left[i - 1] === right[j - 1] ? 0 : 1);
      previous[j] = Math.min(deletion, insertion, substitution);
      diagonal = old;
    }
  }
  return previous[right.length] ?? right.length;
}

function fuzzyThreshold(token: string): number {
  if (token.length >= 8) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

const NORMALIZED_CONCEPT_ALIASES = Object.entries(CONCEPT_ALIASES).map(([concept, aliases]) => ({
  concept,
  aliases: [...new Set(aliases.map(normalizeSearchText).filter(Boolean))],
}));

const SINGLE_ALIAS_TO_CONCEPT = new Map<string, string>();
for (const { concept, aliases } of NORMALIZED_CONCEPT_ALIASES) {
  for (const alias of aliases) {
    if (!alias.includes(' ')) SINGLE_ALIAS_TO_CONCEPT.set(alias, concept);
  }
}

function hasPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

function conceptsInText(text: string): Set<string> {
  const concepts = new Set<string>();
  for (const { concept, aliases } of NORMALIZED_CONCEPT_ALIASES) {
    if (aliases.some((alias) => hasPhrase(text, alias))) concepts.add(concept);
  }
  if (concepts.has('whiteTruffle')) {
    concepts.add('white');
    concepts.add('truffle');
  }
  if (concepts.has('blackTruffle')) {
    concepts.add('black');
    concepts.add('truffle');
  }
  return concepts;
}

function queryConcepts(query: string): { concepts: Set<string>; recognisedTokens: Set<string> } {
  const concepts = conceptsInText(query);
  const recognisedTokens = new Set<string>();
  const tokens = query.split(' ').filter(Boolean);

  for (const token of tokens) {
    const exact = SINGLE_ALIAS_TO_CONCEPT.get(token);
    if (exact) {
      concepts.add(exact);
      recognisedTokens.add(token);
      continue;
    }

    const threshold = fuzzyThreshold(token);
    if (!threshold) continue;
    let best: { concept: string; distance: number } | undefined;
    for (const [alias, concept] of SINGLE_ALIAS_TO_CONCEPT) {
      if (Math.abs(alias.length - token.length) > threshold) continue;
      const distance = levenshtein(token, alias);
      if (distance <= threshold && (!best || distance < best.distance)) best = { concept, distance };
    }
    if (best) {
      concepts.add(best.concept);
      recognisedTokens.add(token);
    }
  }

  for (const { concept, aliases } of NORMALIZED_CONCEPT_ALIASES) {
    for (const alias of aliases) {
      if (!hasPhrase(query, alias)) continue;
      concepts.add(concept);
      for (const part of alias.split(' ')) recognisedTokens.add(part);
    }
  }

  return { concepts, recognisedTokens };
}

interface SearchDocument {
  variant: OfficialProductVariant;
  normalized: string;
  tokens: readonly string[];
  concepts: Set<string>;
}

function buildDocument(variant: OfficialProductVariant): SearchDocument {
  const normalized = normalizeSearchText([
    variant.product,
    variant.sourceName,
    variant.family,
    variant.categoryType,
    variant.size,
    variant.sku,
    variant.barcode,
    variant.ingredients,
    variant.usage,
    variant.origin,
    variant.allergens,
    ...variant.aliases,
  ].join(' '));

  return {
    variant,
    normalized,
    tokens: [...new Set(normalized.split(' ').filter(Boolean))],
    concepts: conceptsInText(normalized),
  };
}

const SEARCH_DOCUMENTS = OFFICIAL_PRODUCT_VARIANTS.map(buildDocument);

function tokenMatchesDocument(token: string, document: SearchDocument): number {
  if (hasPhrase(document.normalized, token)) return 60;
  if (document.tokens.some((candidate) => candidate.startsWith(token) || token.startsWith(candidate))) return 35;

  const threshold = fuzzyThreshold(token);
  if (!threshold) return 0;
  for (const candidate of document.tokens) {
    if (Math.abs(candidate.length - token.length) > threshold) continue;
    if (levenshtein(token, candidate) <= threshold) return 20;
  }
  return 0;
}

function scoreDocument(document: SearchDocument, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 1;

  const { variant } = document;
  if (query === normalizeSearchText(variant.sku) || query === normalizeSearchText(variant.barcode)) return 10000;

  let score = hasPhrase(document.normalized, query) ? 700 : 0;
  const { concepts, recognisedTokens } = queryConcepts(query);

  for (const concept of concepts) {
    if (!document.concepts.has(concept)) return 0;
    score += 180;
  }

  const freeTokens = query
    .split(' ')
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !recognisedTokens.has(token));

  for (const token of freeTokens) {
    const tokenScore = tokenMatchesDocument(token, document);
    if (!tokenScore) return 0;
    score += tokenScore;
  }

  if (!concepts.size && !freeTokens.length) return 0;
  return score;
}

export function searchOfficialProducts(query: string): UniversalSearchHit[] {
  return SEARCH_DOCUMENTS
    .map((document) => ({
      sku: document.variant.sku,
      product: document.variant.product,
      score: scoreDocument(document, query),
    }))
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score || left.product.localeCompare(right.product));
}
