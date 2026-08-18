type HeroLocale = 'en' | 'it' | 'fr' | 'nl';

const EYEBROW = 'HOUSE OF TARTUFO · PRICE CATALOG · B2B';
const MOTTO = 'Truffle. Elevated.';

const TITLES: Readonly<Record<HeroLocale, string>> = {
  en: 'The wholesale catalogue',
  it: 'Il catalogo wholesale',
  fr: 'Le catalogue wholesale',
  nl: 'De wholesale catalogus',
};

const STYLE_ID = 'hot-hero-brand-line-style';

function currentLocale(): HeroLocale {
  const locale = document.documentElement.lang.toLowerCase().split('-')[0];
  return locale === 'it' || locale === 'fr' || locale === 'nl' ? locale : 'en';
}

function installStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hero #hero-title {
      max-width: none !important;
      width: auto;
      margin-inline: 0;
      white-space: nowrap !important;
      text-wrap: nowrap !important;
      font-size: clamp(52px, 6vw, 108px) !important;
      line-height: 0.9 !important;
      letter-spacing: -0.045em;
    }

    .hero .hero-motto {
      margin: clamp(10px, 1.1vw, 18px) 0 0;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: clamp(34px, 3.35vw, 58px);
      font-weight: 500;
      line-height: 0.95;
      letter-spacing: -0.03em;
      white-space: nowrap;
      text-wrap: nowrap;
    }

    @media (min-width: 1100px) {
      .hero #hero-title,
      .hero .hero-motto {
        align-self: center;
      }
    }

    @media (max-width: 820px) {
      .hero #hero-title {
        font-size: clamp(25px, 8.2vw, 54px) !important;
        line-height: 0.96 !important;
      }

      .hero .hero-motto {
        font-size: clamp(27px, 8.4vw, 42px);
        margin-top: 10px;
      }
    }

    @media (max-width: 420px) {
      .hero #hero-title {
        letter-spacing: -0.055em;
      }
    }
  `;
  document.head.append(style);
}

function applyHeroBrandLine(): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const title = document.getElementById('hero-title');
  const eyebrow = hero?.querySelector<HTMLElement>('.eyebrow');
  if (!hero || !title || !eyebrow) return;

  // These three brand lines are intentionally managed here rather than by the
  // generic UI dictionary: their visual hierarchy must remain identical across locales.
  title.removeAttribute('data-ui');
  eyebrow.removeAttribute('data-ui');
  eyebrow.classList.add('hero-brand-eyebrow');

  let motto = hero.querySelector<HTMLElement>('.hero-motto');
  if (!motto) {
    motto = document.createElement('h2');
    motto.className = 'hero-motto';
    title.insertAdjacentElement('afterend', motto);
  }

  const locale = currentLocale();
  eyebrow.textContent = EYEBROW;
  title.textContent = TITLES[locale];
  motto.textContent = MOTTO;
}

function bind(): void {
  installStyles();
  applyHeroBrandLine();

  const localeObserver = new MutationObserver(() => applyHeroBrandLine());
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // A locale click triggers the catalogue renderer synchronously. Re-apply once
  // more in a microtask so the brand line always wins without changing i18n internals.
  document.addEventListener('click', (event) => {
    const localeButton = (event.target as HTMLElement).closest('[data-locale]');
    if (!localeButton) return;
    queueMicrotask(applyHeroBrandLine);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}

export {};
