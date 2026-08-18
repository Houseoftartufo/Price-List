import { expect, test, type Page } from '@playwright/test';

const TITLES = {
  en: 'The wholesale catalogue',
  it: 'Il catalogo wholesale',
  fr: 'Le catalogue wholesale',
  nl: 'De wholesale catalogus',
} as const;

const LOCALE_KEY = 'hot-price-list:locale:v1';

async function expectSingleLineHero(page: Page, locale: keyof typeof TITLES): Promise<void> {
  const title = page.locator('#hero-title');
  const motto = page.locator('.hero-motto');
  const eyebrow = page.locator('.hero .hero-brand-eyebrow');

  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(eyebrow).toHaveText('HOUSE OF TARTUFO · PRICE CATALOG · B2B');
  await expect(title).toHaveText(TITLES[locale]);
  await expect(motto).toHaveText('Truffle. Elevated.');

  const metrics = await page.evaluate(() => {
    const title = document.getElementById('hero-title');
    const motto = document.querySelector<HTMLElement>('.hero-motto');
    if (!title || !motto) throw new Error('Hero brand line is missing.');

    const titleStyle = getComputedStyle(title);
    const mottoStyle = getComputedStyle(motto);
    const titleRect = title.getBoundingClientRect();
    const mottoRect = motto.getBoundingClientRect();

    return {
      titleWhiteSpace: titleStyle.whiteSpace,
      mottoWhiteSpace: mottoStyle.whiteSpace,
      titleHeight: titleRect.height,
      mottoHeight: mottoRect.height,
      titleLineHeight: Number.parseFloat(titleStyle.lineHeight),
      mottoLineHeight: Number.parseFloat(mottoStyle.lineHeight),
      titleRight: titleRect.right,
      mottoRight: mottoRect.right,
      titleLeft: titleRect.left,
      mottoLeft: mottoRect.left,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });

  expect(metrics.titleWhiteSpace).toBe('nowrap');
  expect(metrics.mottoWhiteSpace).toBe('nowrap');
  expect(metrics.titleHeight).toBeLessThanOrEqual(metrics.titleLineHeight * 1.2);
  expect(metrics.mottoHeight).toBeLessThanOrEqual(metrics.mottoLineHeight * 1.2);
  expect(metrics.titleLeft).toBeGreaterThanOrEqual(-1);
  expect(metrics.mottoLeft).toBeGreaterThanOrEqual(-1);
  expect(metrics.titleRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.mottoRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

test('hero uses the new price-catalog eyebrow and one-line H1/H2 in every language', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  for (const locale of ['en', 'it', 'fr', 'nl'] as const) {
    await page.locator(`[data-locale="${locale}"]`).click();
    await expectSingleLineHero(page, locale);
  }
});

test('hero H1 and H2 remain single-line and overflow-free at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('/');

  for (const locale of ['en', 'it', 'fr', 'nl'] as const) {
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: LOCALE_KEY, value: locale },
    );
    await page.reload();
    await expectSingleLineHero(page, locale);
  }
});
