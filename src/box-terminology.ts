import { PREVIEW_COPY, type Locale } from './i18n/i18n';

const BOX_COPY: Record<Locale, Partial<Record<string, string>>> = {
  en: {
    casePack: 'Units / box',
    cases: 'Boxes',
    perCase: '/ box',
    volumePricingBody: 'Discounts apply per product according to the number of boxes ordered.',
    fromCases: 'from {cases} boxes',
    nextTier: 'Add {cases} more boxes for −{discount}%',
    increaseCases: 'Increase boxes',
    decreaseCases: 'Decrease boxes',
  },
  it: {
    casePack: 'Pz / box',
    cases: 'Box',
    perCase: '/ box',
    volumePricingBody: 'Gli sconti si applicano per singolo prodotto in base al numero di box ordinati.',
    fromCases: 'da {cases} box',
    nextTier: 'Aggiungi {cases} box per arrivare a −{discount}%',
    increaseCases: 'Aumenta box',
    decreaseCases: 'Diminuisci box',
  },
  fr: {
    casePack: 'Unités / box',
    cases: 'Box',
    perCase: '/ box',
    volumePricingBody: 'Les remises s’appliquent par produit selon le nombre de box commandées.',
    fromCases: 'dès {cases} box',
    nextTier: 'Ajoutez {cases} box pour atteindre −{discount}%',
    increaseCases: 'Augmenter les box',
    decreaseCases: 'Réduire les box',
  },
  nl: {
    casePack: 'Stuks / box',
    cases: 'Boxen',
    perCase: '/ box',
    volumePricingBody: 'Kortingen gelden per product op basis van het aantal bestelde boxen.',
    fromCases: 'vanaf {cases} boxen',
    nextTier: 'Voeg {cases} boxen toe voor −{discount}%',
    increaseCases: 'Meer boxen',
    decreaseCases: 'Minder boxen',
  },
};

for (const locale of Object.keys(BOX_COPY) as Locale[]) {
  Object.assign(PREVIEW_COPY[locale], BOX_COPY[locale]);
}

const LEGACY_EXACT_TEXT = new Map<string, string>([
  ['Case pack', 'Units / box'],
  ['Cases', 'Boxes'],
  ['Discounts apply per product according to the number of cases ordered.', 'Discounts apply per product according to the number of boxes ordered.'],
  ['Pezzi / scatola', 'Pz / box'],
  ['Pz/scatola', 'Pz / box'],
  ['Scatole', 'Box'],
  ['Pièces / carton', 'Unités / box'],
  ['Unités/boîte', 'Unités / box'],
  ['Boîtes', 'Box'],
  ['Stuks / doos', 'Stuks / box'],
  ['Stuks/doos', 'Stuks / box'],
  ['Dozen', 'Boxen'],
]);

function patchTextNode(node: Text): void {
  const raw = node.nodeValue ?? '';
  const trimmed = raw.trim();
  const replacement = LEGACY_EXACT_TEXT.get(trimmed);
  if (!replacement) return;
  node.nodeValue = raw.replace(trimmed, replacement);
}

function patchLegacyBuyerCopy(root: ParentNode): void {
  if (root instanceof Text) {
    patchTextNode(root);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    patchTextNode(current as Text);
    current = walker.nextNode();
  }
}

function installLegacyCopyGuard(): void {
  patchLegacyBuyerCopy(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' && mutation.target instanceof Text) {
        patchTextNode(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Text) patchTextNode(node);
        else if (node instanceof HTMLElement) patchLegacyBuyerCopy(node);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installLegacyCopyGuard, { once: true });
  } else {
    installLegacyCopyGuard();
  }
}
