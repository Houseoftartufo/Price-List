export type ProductDetailLocale = 'en' | 'it' | 'fr' | 'nl';

type ForeignLocale = Exclude<ProductDetailLocale, 'it'>;
type ForeignTranslations = Record<ForeignLocale, string>;

const TITLES: Record<string, Record<ProductDetailLocale, string>> = {
  'Acacia Honey with Truffle': { en: 'Acacia Honey with Truffle', it: 'Miele di Acacia al Tartufo', fr: 'Miel d’Acacia à la Truffe', nl: 'Acaciahoning met Truffel' },
  'Balsamic Vinegar Pearls': { en: 'Balsamic Vinegar Pearls', it: 'Perle di Aceto Balsamico', fr: 'Perles de Vinaigre Balsamique', nl: 'Balsamicoazijnparels' },
  'Black Truffle Extra-Virgin Olive Oil': { en: 'Black Truffle Extra-Virgin Olive Oil', it: 'Olio Extravergine di Oliva al Tartufo Nero', fr: 'Huile d’Olive Extra Vierge à la Truffe Noire', nl: 'Extra Vierge Olijfolie met Zwarte Truffel' },
  'Butter with Bianchetto Truffle 6%': { en: 'Butter with Bianchetto Truffle 6%', it: 'Burro al Tartufo Bianchetto 6%', fr: 'Beurre à la Truffe Bianchetto 6 %', nl: 'Boter met Bianchetto-truffel 6%' },
  'Butter with Summer Truffle 3%': { en: 'Butter with Summer Truffle 3%', it: 'Burro al Tartufo Estivo 3%', fr: 'Beurre à la Truffe d’Été 3 %', nl: 'Boter met Zomertruffel 3%' },
  'Genovese Pesto': { en: 'Genovese Pesto', it: 'Pesto Genovese', fr: 'Pesto Génois', nl: 'Genovese Pesto' },
  'Grey Salt with Truffle': { en: 'Grey Salt with Truffle', it: 'Sale Grigio al Tartufo', fr: 'Sel Gris à la Truffe', nl: 'Grijs Zout met Truffel' },
  'Himalayan Pink Salt with Truffle': { en: 'Himalayan Pink Salt with Truffle', it: 'Sale Rosa dell’Himalaya al Tartufo', fr: 'Sel Rose de l’Himalaya à la Truffe', nl: 'Himalayazout met Truffel' },
  'Polenta with Summer Truffle': { en: 'Polenta with Summer Truffle', it: 'Polenta al Tartufo Estivo', fr: 'Polenta à la Truffe d’Été', nl: 'Polenta met Zomertruffel' },
  'Porcini Mushroom Cream with Summer Truffle': { en: 'Porcini Mushroom Cream with Summer Truffle', it: 'Crema di Porcini al Tartufo Estivo', fr: 'Crème de Cèpes à la Truffe d’Été', nl: 'Eekhoorntjesbroodcrème met Zomertruffel' },
  'Sea Salt with Summer Truffle': { en: 'Sea Salt with Summer Truffle', it: 'Sale Marino al Tartufo Estivo', fr: 'Sel Marin à la Truffe d’Été', nl: 'Zeezout met Zomertruffel' },
  'Sea Salt with White Truffle': { en: 'Sea Salt with White Truffle', it: 'Sale Marino al Tartufo Bianco', fr: 'Sel Marin à la Truffe Blanche', nl: 'Zeezout met Witte Truffel' },
  'Spicy Truffle Sauce': { en: 'Spicy Truffle Sauce', it: 'Salsa Piccante al Tartufo', fr: 'Sauce Piquante à la Truffe', nl: 'Pittige Truffelsaus' },
  'Summer Truffle Carpaccio': { en: 'Summer Truffle Carpaccio', it: 'Carpaccio di Tartufo Estivo', fr: 'Carpaccio de Truffes d’Été', nl: 'Zomertruffelcarpaccio' },
  'Tartufata White Sauce (with Bianchetto 2%)': { en: 'Tartufata White Sauce (with Bianchetto 2%)', it: 'Salsa Tartufata Bianca (con Bianchetto 2%)', fr: 'Sauce Tartufata Blanche (avec Bianchetto 2 %)', nl: 'Witte Tartufata-saus (met Bianchetto 2%)' },
  'Truffle Almonds': { en: 'Truffle Almonds', it: 'Mandorle al Tartufo', fr: 'Amandes à la Truffe', nl: 'Amandelen met Truffel' },
  'Truffle Cashews': { en: 'Truffle Cashews', it: 'Anacardi al Tartufo', fr: 'Noix de Cajou à la Truffe', nl: 'Cashewnoten met Truffel' },
  'Truffle Ketchup': { en: 'Truffle Ketchup', it: 'Ketchup al Tartufo', fr: 'Ketchup à la Truffe', nl: 'Truffelketchup' },
  'Truffle Mayonnaise': { en: 'Truffle Mayonnaise', it: 'Maionese al Tartufo', fr: 'Mayonnaise à la Truffe', nl: 'Truffelmayonaise' },
  'Truffle Risotto': { en: 'Truffle Risotto', it: 'Risotto al Tartufo', fr: 'Risotto à la Truffe', nl: 'Truffelrisotto' },
  'Truffle Tarallini': { en: 'Truffle Tarallini', it: 'Tarallini al Tartufo', fr: 'Tarallini à la Truffe', nl: 'Tarallini met Truffel' },
  'Truffle Walnuts': { en: 'Truffle Walnuts', it: 'Noci al Tartufo', fr: 'Noix à la Truffe', nl: 'Walnoten met Truffel' },
  'Truffled Sauce – Summer Truffle 10%': { en: 'Truffled Sauce – Summer Truffle 10%', it: 'Salsa Tartufata – Tartufo Estivo 10%', fr: 'Sauce Tartufata – Truffe d’Été 10 %', nl: 'Tartufata-saus – Zomertruffel 10%' },
  'Truffled Sauce – Summer Truffle 5%': { en: 'Truffled Sauce – Summer Truffle 5%', it: 'Salsa Tartufata – Tartufo Estivo 5%', fr: 'Sauce Tartufata – Truffe d’Été 5 %', nl: 'Tartufata-saus – Zomertruffel 5%' },
  'White Truffle Balsamic Cream of Modena': { en: 'White Truffle Balsamic Cream of Modena', it: 'Crema Balsamica di Modena al Tartufo Bianco', fr: 'Crème Balsamique de Modène à la Truffe Blanche', nl: 'Balsamicocrème uit Modena met Witte Truffel' },
  'White Truffle Balsamic Vinegar Spray': { en: 'White Truffle Balsamic Vinegar Spray', it: 'Spray di Aceto Balsamico al Tartufo Bianco', fr: 'Spray de Vinaigre Balsamique à la Truffe Blanche', nl: 'Balsamicoazijnspray met Witte Truffel' },
  'White Truffle Extra Virgin Olive Oil': { en: 'White Truffle Extra Virgin Olive Oil', it: 'Olio Extravergine di Oliva al Tartufo Bianco', fr: 'Huile d’Olive Extra Vierge à la Truffe Blanche', nl: 'Extra Vierge Olijfolie met Witte Truffel' },
};

const INGREDIENTS: Record<string, ForeignTranslations> = {
  "Aceto Balsamico di Modena I.G.P. 60% min. (aceto di vino, mosto d'uva cotto), acqua, gelificanti: gomma di cellulosa, cloruro di calcio, alginato di sodio, tartufo estivo 0,1%, aroma.": {
    en: 'Modena Balsamic Vinegar PGI min. 60% (wine vinegar, cooked grape must), water, gelling agents: cellulose gum, calcium chloride, sodium alginate, summer truffle 0.1%, flavouring.',
    fr: 'Vinaigre balsamique de Modène IGP min. 60 % (vinaigre de vin, moût de raisin cuit), eau, gélifiants : gomme de cellulose, chlorure de calcium, alginate de sodium, truffe d’été 0,1 %, arôme.',
    nl: 'Balsamicoazijn uit Modena BGA min. 60% (wijnazijn, gekookte druivenmost), water, geleermiddelen: cellulosegom, calciumchloride, natriumalginaat, zomertruffel 0,1%, aroma.',
  },
  'ANACARDI sgusciati tostati 92,5%; olio di girasole 5%; [sale, tartufo estivo (Tuber aestivum Vitt) 1%, aromi] 2,5%.': {
    en: 'Roasted shelled CASHEWS 92.5%; sunflower oil 5%; [salt, summer truffle (Tuber aestivum Vitt) 1%, flavourings] 2.5%.',
    fr: 'NOIX DE CAJOU décortiquées grillées 92,5 % ; huile de tournesol 5 % ; [sel, truffe d’été (Tuber aestivum Vitt) 1 %, arômes] 2,5 %.',
    nl: 'Geroosterde gepelde CASHEWNOTEN 92,5%; zonnebloemolie 5%; [zout, zomertruffel (Tuber aestivum Vitt) 1%, aroma’s] 2,5%.',
  },
  'BURRO (LATTOSIO), tartufo bianchetto (Tuber borchii, Vittad.) 6%, sale, aroma.': {
    en: 'BUTTER (LACTOSE), bianchetto truffle (Tuber borchii, Vittad.) 6%, salt, flavouring.',
    fr: 'BEURRE (LACTOSE), truffe bianchetto (Tuber borchii, Vittad.) 6 %, sel, arôme.',
    nl: 'BOTER (LACTOSE), bianchetto-truffel (Tuber borchii, Vittad.) 6%, zout, aroma.',
  },
  'BURRO (LATTOSIO), tartufo estivo (Tuber aestivum, Vittad.) 3%, sale, aroma.': {
    en: 'BUTTER (LACTOSE), summer truffle (Tuber aestivum, Vittad.) 3%, salt, flavouring.',
    fr: 'BEURRE (LACTOSE), truffe d’été (Tuber aestivum, Vittad.) 3 %, sel, arôme.',
    nl: 'BOTER (LACTOSE), zomertruffel (Tuber aestivum, Vittad.) 3%, zout, aroma.',
  },
  'Farina di GRANO tenero tipo 0, vino bianco (SOLFITI), olio di girasole alto oleico, olio extravergine di oliva, grano saraceno, sale, acqua, tartufo estivo (Tuber aestivum Vitt.) 1,2%, aroma naturale.': {
    en: 'Type 0 soft WHEAT flour, white wine (SULPHITES), high-oleic sunflower oil, extra virgin olive oil, buckwheat, salt, water, summer truffle (Tuber aestivum Vitt.) 1.2%, natural flavouring.',
    fr: 'Farine de BLÉ tendre type 0, vin blanc (SULFITES), huile de tournesol à haute teneur en acide oléique, huile d’olive extra vierge, sarrasin, sel, eau, truffe d’été (Tuber aestivum Vitt.) 1,2 %, arôme naturel.',
    nl: 'Zachte TARWEBLOEM type 0, witte wijn (SULFIETEN), high-oleic zonnebloemolie, extra vierge olijfolie, boekweit, zout, water, zomertruffel (Tuber aestivum Vitt.) 1,2%, natuurlijk aroma.',
  },
  'Farina di mais, farina di grano saraceno, aroma, tartufo estivo essiccato (Tuber aestivum, Vitt.) 0,2%.': {
    en: 'Corn flour, buckwheat flour, flavouring, dried summer truffle (Tuber aestivum, Vitt.) 0.2%.',
    fr: 'Farine de maïs, farine de sarrasin, arôme, truffe d’été séchée (Tuber aestivum, Vitt.) 0,2 %.',
    nl: 'Maïsmeel, boekweitmeel, aroma, gedroogde zomertruffel (Tuber aestivum, Vitt.) 0,2%.',
  },
  'Funghi Champignon, tartufo nero estivo (Tuber aestivum Vitt.), olio EVO, olive nere, paprika, peperoncino piccante, aromi di tartufo, sale, prezzemolo.': {
    en: 'Champignon mushrooms, black summer truffle (Tuber aestivum Vitt.), extra virgin olive oil, black olives, paprika, hot chilli pepper, truffle flavourings, salt, parsley.',
    fr: 'Champignons de Paris, truffe noire d’été (Tuber aestivum Vitt.), huile d’olive extra vierge, olives noires, paprika, piment, arômes de truffe, sel, persil.',
    nl: 'Champignons, zwarte zomertruffel (Tuber aestivum Vitt.), extra vierge olijfolie, zwarte olijven, paprika, chilipeper, truffelaroma’s, zout, peterselie.',
  },
  'Funghi porcini (Boletus edulis), tartufo nero estivo (Tuber aestivum Vitt.) 5%, olio EVO, sale, pepe, prezzemolo, aroma.': {
    en: 'Porcini mushrooms (Boletus edulis), black summer truffle (Tuber aestivum Vitt.) 5%, extra virgin olive oil, salt, pepper, parsley, flavouring.',
    fr: 'Cèpes (Boletus edulis), truffe noire d’été (Tuber aestivum Vitt.) 5 %, huile d’olive extra vierge, sel, poivre, persil, arôme.',
    nl: 'Eekhoorntjesbrood (Boletus edulis), zwarte zomertruffel (Tuber aestivum Vitt.) 5%, extra vierge olijfolie, zout, peper, peterselie, aroma.',
  },
  'Funghi prataioli coltivati (Agaricus bisporus), olio di semi di girasole, tartufo bianchetto (Tuber borchii, Vittad.), farina di riso, sale, aroma.': {
    en: 'Cultivated mushrooms (Agaricus bisporus), sunflower seed oil, bianchetto truffle (Tuber borchii, Vittad.), rice flour, salt, flavouring.',
    fr: 'Champignons cultivés (Agaricus bisporus), huile de graines de tournesol, truffe bianchetto (Tuber borchii, Vittad.), farine de riz, sel, arôme.',
    nl: 'Gekweekte champignons (Agaricus bisporus), zonnebloemolie, bianchetto-truffel (Tuber borchii, Vittad.), rijstmeel, zout, aroma.',
  },
  'Funghi prataioli coltivati (Agaricus bisporus), olio di semi di girasole, tartufo estivo (Tuber aestivum, Vittad.), olive nere, sale, aroma, aglio, prezzemolo.': {
    en: 'Cultivated mushrooms (Agaricus bisporus), sunflower seed oil, summer truffle (Tuber aestivum, Vittad.), black olives, salt, flavouring, garlic, parsley.',
    fr: 'Champignons cultivés (Agaricus bisporus), huile de graines de tournesol, truffe d’été (Tuber aestivum, Vittad.), olives noires, sel, arôme, ail, persil.',
    nl: 'Gekweekte champignons (Agaricus bisporus), zonnebloemolie, zomertruffel (Tuber aestivum, Vittad.), zwarte olijven, zout, aroma, knoflook, peterselie.',
  },
  'MANDORLE sgusciate tostate 92,5%; olio di girasole 5%; [sale, tartufo estivo (Tuber aestivum Vitt) 1%, aromi] 2,5%.': {
    en: 'Roasted shelled ALMONDS 92.5%; sunflower oil 5%; [salt, summer truffle (Tuber aestivum Vitt) 1%, flavourings] 2.5%.',
    fr: 'AMANDES décortiquées grillées 92,5 % ; huile de tournesol 5 % ; [sel, truffe d’été (Tuber aestivum Vitt) 1 %, arômes] 2,5 %.',
    nl: 'Geroosterde gepelde AMANDELEN 92,5%; zonnebloemolie 5%; [zout, zomertruffel (Tuber aestivum Vitt) 1%, aroma’s] 2,5%.',
  },
  "Miele d'acacia, tartufo bianchetto (Tuber borchii Vitt.) 0,5% (2% in origine), aroma.": {
    en: 'Acacia honey, bianchetto truffle (Tuber borchii Vitt.) 0.5% (2% originally), flavouring.',
    fr: 'Miel d’acacia, truffe bianchetto (Tuber borchii Vitt.) 0,5 % (2 % à l’origine), arôme.',
    nl: 'Acaciahoning, bianchetto-truffel (Tuber borchii Vitt.) 0,5% (oorspronkelijk 2%), aroma.',
  },
  "Mosto d'uva concentrato, aceto balsamico di Modena IGP (aceto di vino, mosto d'uva concentrato, colorante E150d), aceto di vino, colorante E150d, aroma.": {
    en: 'Concentrated grape must, Modena Balsamic Vinegar PGI (wine vinegar, concentrated grape must, colouring E150d), wine vinegar, colouring E150d, flavouring.',
    fr: 'Moût de raisin concentré, vinaigre balsamique de Modène IGP (vinaigre de vin, moût de raisin concentré, colorant E150d), vinaigre de vin, colorant E150d, arôme.',
    nl: 'Geconcentreerde druivenmost, balsamicoazijn uit Modena BGA (wijnazijn, geconcentreerde druivenmost, kleurstof E150d), wijnazijn, kleurstof E150d, aroma.',
  },
  'Noci sgusciate tostate 95%; olio di girasole 3,4%; [sale, tartufo estivo (Tuber aestivum Vitt) 1%, aromi] 1,6%.': {
    en: 'Roasted shelled WALNUTS 95%; sunflower oil 3.4%; [salt, summer truffle (Tuber aestivum Vitt) 1%, flavourings] 1.6%.',
    fr: 'NOIX décortiquées grillées 95 % ; huile de tournesol 3,4 % ; [sel, truffe d’été (Tuber aestivum Vitt) 1 %, arômes] 1,6 %.',
    nl: 'Geroosterde gepelde WALNOTEN 95%; zonnebloemolie 3,4%; [zout, zomertruffel (Tuber aestivum Vitt) 1%, aroma’s] 1,6%.',
  },
  "Olio di oliva, basilico Genovese, anacardi, olio extra vergine d'oliva, sale, pinoli, tartufo bianco (Tuber Magnatum Pico), aroma.": {
    en: 'Olive oil, Genovese basil, cashews, extra virgin olive oil, salt, pine nuts, white truffle (Tuber magnatum Pico), flavouring.',
    fr: 'Huile d’olive, basilic génois, noix de cajou, huile d’olive extra vierge, sel, pignons de pin, truffe blanche (Tuber magnatum Pico), arôme.',
    nl: 'Olijfolie, Genovese basilicum, cashewnoten, extra vierge olijfolie, zout, pijnboompitten, witte truffel (Tuber magnatum Pico), aroma.',
  },
  'Olio di semi di girasole, UOVO pastorizzato, aceto di vino, olio extra vergine di oliva, tartufo estivo (Tuber aestivum Vitt.), sale, aroma.': {
    en: 'Sunflower seed oil, pasteurised EGG, wine vinegar, extra virgin olive oil, summer truffle (Tuber aestivum Vitt.), salt, flavouring.',
    fr: 'Huile de graines de tournesol, ŒUF pasteurisé, vinaigre de vin, huile d’olive extra vierge, truffe d’été (Tuber aestivum Vitt.), sel, arôme.',
    nl: 'Zonnebloemolie, gepasteuriseerd EI, wijnazijn, extra vierge olijfolie, zomertruffel (Tuber aestivum Vitt.), zout, aroma.',
  },
  'Olio extravergine di oliva, aroma.': {
    en: 'Extra virgin olive oil, flavouring.',
    fr: 'Huile d’olive extra vierge, arôme.',
    nl: 'Extra vierge olijfolie, aroma.',
  },
  'Pomodoro (148 g per 100 g di prodotto), aceto di alcool, tartufo estivo (Tuber aestivum Vitt.) 1%, zucchero, sale, spezie ed estratti di erbe aromatiche (contiene sedano), spezie, aroma.': {
    en: 'Tomato (148 g per 100 g of product), spirit vinegar, summer truffle (Tuber aestivum Vitt.) 1%, sugar, salt, spices and herb extracts (contains celery), spices, flavouring.',
    fr: 'Tomate (148 g pour 100 g de produit), vinaigre d’alcool, truffe d’été (Tuber aestivum Vitt.) 1 %, sucre, sel, épices et extraits d’herbes aromatiques (contient du céleri), épices, arôme.',
    nl: 'Tomaat (148 g per 100 g product), alcoholazijn, zomertruffel (Tuber aestivum Vitt.) 1%, suiker, zout, specerijen en kruidenextracten (bevat selderij), specerijen, aroma.',
  },
  'Riso carnaroli, funghi essiccati (Agaricus bisporus), tartufo estivo essiccato (Tuber aestivum, Vitt.) 0,3%, aroma.': {
    en: 'Carnaroli rice, dried mushrooms (Agaricus bisporus), dried summer truffle (Tuber aestivum, Vitt.) 0.3%, flavouring.',
    fr: 'Riz Carnaroli, champignons séchés (Agaricus bisporus), truffe d’été séchée (Tuber aestivum, Vitt.) 0,3 %, arôme.',
    nl: 'Carnarolirijst, gedroogde champignons (Agaricus bisporus), gedroogde zomertruffel (Tuber aestivum, Vitt.) 0,3%, aroma.',
  },
  'Sale grigio, tartufo estivo essiccato (Tuber aestivum, Vittad.) 2%, aroma.': {
    en: 'Grey salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.',
    fr: 'Sel gris, truffe d’été séchée (Tuber aestivum, Vittad.) 2 %, arôme.',
    nl: 'Grijs zout, gedroogde zomertruffel (Tuber aestivum, Vittad.) 2%, aroma.',
  },
  'Sale grigio, tartufo estivo essiccato (Tuber Magnatum, Pico.) 1%, aroma.': {
    en: 'Grey salt, dried truffle (Tuber magnatum, Pico.) 1%, flavouring.',
    fr: 'Sel gris, truffe séchée (Tuber magnatum, Pico.) 1 %, arôme.',
    nl: 'Grijs zout, gedroogde truffel (Tuber magnatum, Pico.) 1%, aroma.',
  },
  'Sale Rosa Himalaya, tartufo estivo essiccato (Tuber aestivum, Vittad.) 2%, aroma.': {
    en: 'Himalayan pink salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.',
    fr: 'Sel rose de l’Himalaya, truffe d’été séchée (Tuber aestivum, Vittad.) 2 %, arôme.',
    nl: 'Roze Himalayazout, gedroogde zomertruffel (Tuber aestivum, Vittad.) 2%, aroma.',
  },
  'Sale, tartufo estivo essiccato (Tuber aestivum, Vitlad.) 2%, aroma. Salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.': {
    en: 'Salt, dried summer truffle (Tuber aestivum, Vittad.) 2%, flavouring.',
    fr: 'Sel, truffe d’été séchée (Tuber aestivum, Vittad.) 2 %, arôme.',
    nl: 'Zout, gedroogde zomertruffel (Tuber aestivum, Vittad.) 2%, aroma.',
  },
  "Succo d'uva concentrato, aceto balsamico di Modena IGP 35% (aceto di vino, mosto d'uva concentrato, colorante E150d), sciroppo di glucosio-fruttosio, aceto di vino, amido modificato, colorante E150d, aroma.": {
    en: 'Concentrated grape juice, Modena Balsamic Vinegar PGI 35% (wine vinegar, concentrated grape must, colouring E150d), glucose-fructose syrup, wine vinegar, modified starch, colouring E150d, flavouring.',
    fr: 'Jus de raisin concentré, vinaigre balsamique de Modène IGP 35 % (vinaigre de vin, moût de raisin concentré, colorant E150d), sirop de glucose-fructose, vinaigre de vin, amidon modifié, colorant E150d, arôme.',
    nl: 'Geconcentreerd druivensap, balsamicoazijn uit Modena BGA 35% (wijnazijn, geconcentreerde druivenmost, kleurstof E150d), glucose-fructosestroop, wijnazijn, gemodificeerd zetmeel, kleurstof E150d, aroma.',
  },
  'Tartufo estivo (Tuber aestivum, Vittad.) 60%, acqua, aroma.': {
    en: 'Summer truffle (Tuber aestivum, Vittad.) 60%, water, flavouring.',
    fr: 'Truffe d’été (Tuber aestivum, Vittad.) 60 %, eau, arôme.',
    nl: 'Zomertruffel (Tuber aestivum, Vittad.) 60%, water, aroma.',
  },
};

const ALLERGENS: Record<string, ForeignTranslations> = {
  'Contiene NOCI. Può contenere tracce di SOIA, SEMI DI SESAMO, SENAPE, altra FRUTTA A GUSCIO e ANIDRIDE SOLFOROSA.': {
    en: 'Contains WALNUTS. May contain traces of SOYA, SESAME SEEDS, MUSTARD, other NUTS and SULPHUR DIOXIDE.',
    fr: 'Contient des NOIX. Peut contenir des traces de SOJA, GRAINES DE SÉSAME, MOUTARDE, autres FRUITS À COQUE et DIOXYDE DE SOUFRE.',
    nl: 'Bevat WALNOTEN. Kan sporen bevatten van SOJA, SESAMZAAD, MOSTERD, andere NOTEN en ZWAVELDIOXIDE.',
  },
  'Frutta a guscio. Può contenere tracce di altra frutta a guscio e arachidi.': {
    en: 'Nuts. May contain traces of other nuts and peanuts.',
    fr: 'Fruits à coque. Peut contenir des traces d’autres fruits à coque et d’arachides.',
    nl: 'Noten. Kan sporen bevatten van andere noten en pinda’s.',
  },
  'GRANO e SOLFITI; la scheda dichiara nessun ulteriore allergene oltre a quelli indicati negli ingredienti.': {
    en: 'WHEAT and SULPHITES; the technical sheet declares no additional allergens beyond those listed in the ingredients.',
    fr: 'BLÉ et SULFITES ; la fiche technique ne déclare aucun autre allergène que ceux indiqués dans les ingrédients.',
    nl: 'TARWE en SULFIETEN; het technische fiche vermeldt geen bijkomende allergenen naast die in de ingrediënten.',
  },
  'La scheda riporta: contiene ARACHIDI; può contenere tracce di SOIA, SEMI DI SESAMO, SENAPE, altra FRUTTA A GUSCIO e ANIDRIDE SOLFOROSA.': {
    en: 'The technical sheet states: contains PEANUTS; may contain traces of SOYA, SESAME SEEDS, MUSTARD, other NUTS and SULPHUR DIOXIDE.',
    fr: 'La fiche technique indique : contient des ARACHIDES ; peut contenir des traces de SOJA, GRAINES DE SÉSAME, MOUTARDE, autres FRUITS À COQUE et DIOXYDE DE SOUFRE.',
    nl: 'Het technische fiche vermeldt: bevat PINDA’S; kan sporen bevatten van SOJA, SESAMZAAD, MOSTERD, andere NOTEN en ZWAVELDIOXIDE.',
  },
  'LATTOSIO / latte indicato negli ingredienti; nessun ulteriore allergene dichiarato.': {
    en: 'LACTOSE / milk is listed in the ingredients; no additional allergens declared.',
    fr: 'LACTOSE / lait indiqué dans les ingrédients ; aucun autre allergène déclaré.',
    nl: 'LACTOSE / melk vermeld in de ingrediënten; geen bijkomende allergenen aangegeven.',
  },
  'Nessuno': { en: 'None', fr: 'Aucun', nl: 'Geen' },
  'SEDANO indicato negli ingredienti; nessun ulteriore allergene dichiarato.': {
    en: 'CELERY is listed in the ingredients; no additional allergens declared.',
    fr: 'CÉLERI indiqué dans les ingrédients ; aucun autre allergène déclaré.',
    nl: 'SELDERIJ vermeld in de ingrediënten; geen bijkomende allergenen aangegeven.',
  },
  'Solfiti': { en: 'Sulphites', fr: 'Sulfites', nl: 'Sulfieten' },
  'SOLFITI; nessun ulteriore allergene dichiarato.': {
    en: 'SULPHITES; no additional allergens declared.',
    fr: 'SULFITES ; aucun autre allergène déclaré.',
    nl: 'SULFIETEN; geen bijkomende allergenen aangegeven.',
  },
  'UOVO; nessun ulteriore allergene dichiarato oltre a quello indicato negli ingredienti.': {
    en: 'EGG; no additional allergens declared beyond the one listed in the ingredients.',
    fr: 'ŒUF ; aucun autre allergène déclaré au-delà de celui indiqué dans les ingrédients.',
    nl: 'EI; geen bijkomende allergenen aangegeven naast het allergeen in de ingrediënten.',
  },
};

const USAGE: Record<string, ForeignTranslations> = {
  "Pronto all'uso.": { en: 'Ready to use.', fr: 'Prêt à l’emploi.', nl: 'Klaar voor gebruik.' },
  'Una volta aperto, il prodotto è pronto per essere consumato.': { en: 'Once opened, the product is ready to consume.', fr: 'Une fois ouvert, le produit est prêt à être consommé.', nl: 'Na opening is het product klaar voor consumptie.' },
  'Una volta aperto, il prodotto è pronto per essere utilizzato/consumato.': { en: 'Once opened, the product is ready to use or consume.', fr: 'Une fois ouvert, le produit est prêt à être utilisé ou consommé.', nl: 'Na opening is het product klaar voor gebruik of consumptie.' },
  'Una volta aperto, pronto al consumo. Titolo alcolometrico 1,8%.': { en: 'Once opened, ready to consume. Alcohol by volume 1.8%.', fr: 'Une fois ouvert, prêt à consommer. Titre alcoométrique 1,8 % vol.', nl: 'Na opening klaar voor consumptie. Alcoholgehalte 1,8% vol.' },
};

const STORAGE: Record<string, ForeignTranslations> = {
  "Conservare a 10-20°C al riparo da sole e luce diretta. Dopo l'apertura conservare in frigorifero e consumare entro 10 giorni.": {
    en: 'Store at 10–20°C away from sunlight and direct light. After opening, refrigerate and consume within 10 days.',
    fr: 'Conserver entre 10 et 20 °C, à l’abri du soleil et de la lumière directe. Après ouverture, conserver au réfrigérateur et consommer dans les 10 jours.',
    nl: 'Bewaren bij 10–20°C, uit de buurt van zonlicht en direct licht. Na opening in de koelkast bewaren en binnen 10 dagen consumeren.',
  },
  'Conservare a temperatura ambiente, al riparo di luce e fonti di calore.': {
    en: 'Store at room temperature, away from light and heat sources.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen.',
  },
  'Conservare a temperatura ambiente, al riparo di luce e fonti di calore. A confezione aperta conservare nella confezione originale, al riparo da luce diretta e calore.': {
    en: 'Store at room temperature, away from light and heat sources. Once opened, keep in the original packaging, away from direct light and heat.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver dans l’emballage d’origine, à l’abri de la lumière directe et de la chaleur.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen. Na opening in de originele verpakking bewaren, uit de buurt van direct licht en warmte.',
  },
  'Conservare a temperatura ambiente, al riparo di luce e fonti di calore. A confezione aperta conservare nella confezione originale, lontano da luce e calore, in luogo ben ventilato.': {
    en: 'Store at room temperature, away from light and heat sources. Once opened, keep in the original packaging, away from light and heat, in a well-ventilated place.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver dans l’emballage d’origine, à l’écart de la lumière et de la chaleur, dans un endroit bien ventilé.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen. Na opening in de originele verpakking bewaren, uit de buurt van licht en warmte, op een goed geventileerde plaats.',
  },
  "Conservare a temperatura ambiente, al riparo di luce e fonti di calore. Dopo l'apertura conservare in frigo tra 0 e 4°C e consumare entro 4-5 giorni.": {
    en: 'Store at room temperature, away from light and heat sources. After opening, refrigerate between 0 and 4°C and consume within 4–5 days.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver au réfrigérateur entre 0 et 4 °C et consommer dans les 4 à 5 jours.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen. Na opening in de koelkast bewaren tussen 0 en 4°C en binnen 4–5 dagen consumeren.',
  },
  "Conservare a temperatura ambiente, al riparo di luce e fonti di calore. Dopo l'apertura conservare nella confezione originale, al riparo dalla luce, in luogo asciutto e ben ventilato.": {
    en: 'Store at room temperature, away from light and heat sources. After opening, keep in the original packaging, protected from light, in a dry and well-ventilated place.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver dans l’emballage d’origine, à l’abri de la lumière, dans un endroit sec et bien ventilé.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen. Na opening in de originele verpakking bewaren, beschermd tegen licht, op een droge en goed geventileerde plaats.',
  },
  "Conservare a temperatura ambiente, al riparo di luce e fonti di calore. Dopo l'apertura, conservare in frigo tra 0 e 4°C e consumare entro 4-5 giorni.": {
    en: 'Store at room temperature, away from light and heat sources. After opening, refrigerate between 0 and 4°C and consume within 4–5 days.',
    fr: 'Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver au réfrigérateur entre 0 et 4 °C et consommer dans les 4 à 5 jours.',
    nl: 'Bewaren op kamertemperatuur, uit de buurt van licht en warmtebronnen. Na opening in de koelkast bewaren tussen 0 en 4°C en binnen 4–5 dagen consumeren.',
  },
  'Conservare in luogo fresco (max 20°C) e asciutto.': {
    en: 'Store in a cool (max. 20°C), dry place.',
    fr: 'Conserver dans un endroit frais (max. 20 °C) et sec.',
    nl: 'Bewaren op een koele (max. 20°C), droge plaats.',
  },
  "Conservare in luogo fresco e asciutto, al riparo dalla luce solare diretta (8-15°C). Dopo l'apertura conservare in frigo tra 0 e 4°C e consumare entro 4-5 giorni.": {
    en: 'Store in a cool, dry place away from direct sunlight (8–15°C). After opening, refrigerate between 0 and 4°C and consume within 4–5 days.',
    fr: 'Conserver dans un endroit frais et sec, à l’abri de la lumière directe du soleil (8–15 °C). Après ouverture, conserver au réfrigérateur entre 0 et 4 °C et consommer dans les 4 à 5 jours.',
    nl: 'Bewaren op een koele, droge plaats, uit direct zonlicht (8–15°C). Na opening in de koelkast bewaren tussen 0 en 4°C en binnen 4–5 dagen consumeren.',
  },
  'Conservare in luogo fresco e asciutto.': {
    en: 'Store in a cool, dry place.',
    fr: 'Conserver dans un endroit frais et sec.',
    nl: 'Bewaren op een koele, droge plaats.',
  },
};

export type MasterDetailField = 'ingredients' | 'allergens' | 'usage' | 'storage';

const DETAIL_TABLES: Record<MasterDetailField, Record<string, ForeignTranslations>> = {
  ingredients: INGREDIENTS,
  allergens: ALLERGENS,
  usage: USAGE,
  storage: STORAGE,
};

export function translateMasterTitle(value: string, locale: ProductDetailLocale): string {
  return TITLES[value]?.[locale] ?? value;
}

export function translateMasterDetail(field: MasterDetailField, value: string, locale: ProductDetailLocale): string {
  if (locale === 'it') return value;
  return DETAIL_TABLES[field][value]?.[locale] ?? value;
}

export function hasMasterDetailTranslation(field: MasterDetailField, value: string, locale: ProductDetailLocale): boolean {
  return locale === 'it' || Boolean(DETAIL_TABLES[field][value]?.[locale]);
}

export function hasMasterTitleTranslation(value: string, locale: ProductDetailLocale): boolean {
  return Boolean(TITLES[value]?.[locale]);
}
