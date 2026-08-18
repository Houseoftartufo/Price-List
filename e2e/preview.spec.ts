import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { OFFICIAL_MASTER_COUNTS, OFFICIAL_PRODUCT_VARIANTS, type OfficialProductVariant } from '../src/official-product-master';
import { findRemasteredOfficialVariant } from '../src/official-product-remaster';

mkdirSync('qa-screenshots', { recursive: true });

const OFFICIAL_ACTIVE_CATEGORIES = '6';

async function expectLoadedProductImage(image: Locator): Promise<void> {
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
}

function variantByOfficialKey(officialKey: string): OfficialProductVariant {
  for (const entry of OFFICIAL_PRODUCT_VARIANTS) {
    const remastered = findRemasteredOfficialVariant(entry.product, entry.size);
    if (remastered?.officialKey === officialKey) return entry;
  }
  throw new Error(`Unknown official key: ${officialKey}`);
}

async function waitForGroupedCatalogue(page: Page): Promise<Locator> {
  const rows = page.locator('#product-rows tr[data-format-grouped="true"]');
  await expect(rows).toHaveCount(OFFICIAL_MASTER_COUNTS.families);
  return rows;
}

async function selectOfficialVariant(page: Page, officialKey: string): Promise<Locator> {
  if (!page.url().includes('/preview.html') && !page.url().endsWith('/')) await page.goto('/preview.html');
  await waitForGroupedCatalogue(page);

  const variant = variantByOfficialKey(officialKey);
  const currentRow = page.locator(`#product-rows tr[data-sku="${variant.sku}"]`);
  if (!(await currentRow.count())) {
    const selector = page.locator(`#product-rows select[data-format-select]:has(option[value="${variant.sku}"])`).first();
    await expect(selector, `format selector for ${officialKey}`).toBeVisible();
    await selector.selectOption(variant.sku);
  }

  const row = page.locator(`#product-rows tr[data-sku="${variant.sku}"]`);
  await expect(row, officialKey).toBeVisible();
  await expect(row).toHaveAttribute('data-official-key', officialKey);
  return row;
}

async function openOfficialProduct(page: Page, officialKey: string): Promise<{ row: Locator; dialog: Locator }> {
  if (!page.url().includes('/preview.html')) await page.goto('/preview.html');
  const row = await selectOfficialVariant(page, officialKey);
  await row.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-official-master', 'matched');
  return { row, dialog };
}

test('production homepage presents one row per product family while preserving all 55 official SKUs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.locator('#metric-products')).toHaveText(String(OFFICIAL_MASTER_COUNTS.families));
  await expect(page.locator('#metric-categories')).toHaveText(OFFICIAL_ACTIVE_CATEGORIES);

  const rows = await waitForGroupedCatalogue(page);
  const representedVariants = await rows.evaluateAll((items) =>
    items.reduce((total, row) => {
      const selector = row.querySelector('select[data-format-select]') as HTMLSelectElement | null;
      return total + (selector ? selector.options.length : 1);
    }, 0),
  );
  expect(representedVariants).toBe(OFFICIAL_MASTER_COUNTS.variants);

  await expect(page.locator('#quote-trigger')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
  await page.screenshot({ path: 'qa-screenshots/production-homepage.png' });
});

test('jar formats are unified and selecting a format atomically changes the official SKU row', async ({ page }) => {
  await page.goto('/preview.html');
  await waitForGroupedCatalogue(page);

  const familyRow = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(familyRow).toBeVisible();
  const selector = familyRow.locator('[data-format-select]');
  await expect(selector.locator('option')).toHaveText(['45g', '80g', '170g', '500g']);

  await selector.selectOption('5430004174424');
  const row170 = page.locator('#product-rows tr[data-sku="5430004174424"]');
  await expect(row170).toBeVisible();
  await expect(row170).toHaveAttribute('data-official-key', 'summer truffle carpaccio|170g');
  await expect(row170.locator('.sku-badge')).toHaveText('5430004174424');
  await expect(row170.locator('[data-format-select]')).toHaveValue('5430004174424');
  await expect(row170.locator('td').nth(2)).toContainText('12');

  await row170.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174424');
  await expect(dialog.locator('.product-detail-specs')).toContainText('170g');
  await dialog.locator('[data-product-detail-close]').click();
});

test('olive oils use one family row across bottle and bulk formats including 1L, 3L and 5L', async ({ page }) => {
  await page.goto('/preview.html');
  await waitForGroupedCatalogue(page);

  const whiteOil = page.locator('#product-rows tr[data-product-family="White Truffle Extra Virgin Olive Oil"]');
  await expect(whiteOil).toBeVisible();
  await expect(whiteOil.locator('[data-format-select] option')).toHaveText(['100ml', '250ml', '1L', '3L', '5L']);

  await whiteOil.locator('[data-format-select]').selectOption('5430004174431');
  const white3L = page.locator('#product-rows tr[data-sku="5430004174431"]');
  await expect(white3L).toBeVisible();
  await expect(white3L).toHaveAttribute('data-order-status', 'standby');
  await expect(white3L).toContainText(/Price pending|Prezzo in attesa/i);
  await expect(white3L.locator('[data-add-quote]:not(:disabled)')).toHaveCount(0);

  await white3L.locator('[data-format-select]').selectOption('5430004174035');
  const white5L = page.locator('#product-rows tr[data-sku="5430004174035"]');
  await expect(white5L).toBeVisible();
  await expect(white5L).toHaveAttribute('data-order-status', 'orderable');
  await expect(white5L.locator('td').nth(2)).toContainText('4');

  const blackOil = page.locator('#product-rows tr[data-product-family="Black Truffle Extra-Virgin Olive Oil"]');
  await expect(blackOil).toBeVisible();
  await expect(blackOil.locator('[data-format-select] option')).toHaveText(['100ml', '250ml', '1L', '3L', '5L']);
  await blackOil.locator('[data-format-select]').selectOption('5430004174462');
  const black1L = page.locator('#product-rows tr[data-sku="5430004174462"]');
  await expect(black1L).toHaveAttribute('data-order-status', 'standby');
  await expect(black1L).toContainText(/Price pending|Prezzo in attesa/i);
});

test('desktop buyer prices and quotes the currently selected official format', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html');

  const row = await selectOfficialVariant(page, 'tartufata white sauce with bianchetto 2%|500g');
  await expect(row).toHaveAttribute('data-order-status', 'orderable');
  await expect(row.locator('.product-name')).toHaveText('Tartufata White Sauce (with Bianchetto 2%)');
  await expect(row.locator('td').nth(2)).toContainText('6');
  await expect(row.locator('.dynamic-price')).toBeVisible();

  const quantity = row.locator('[data-qty-input]');
  await quantity.fill('2');
  await quantity.press('Tab');
  await expect(page.locator('#product-rows tr[data-sku="5430004174240"] .discount-pill')).toContainText('5%');

  await page.locator('#product-rows tr[data-sku="5430004174240"] [data-add-quote]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('Tartufata White Sauce');
  await expect(page.locator('#quote-lines')).toContainText('5430004174240');
  await expect(page.locator('#whatsapp-order')).toHaveAttribute('href', /wa\.me\/32480205715/);
  await expect(page.locator('#email-order')).toHaveAttribute('href', /^mailto:/);
  await page.locator('#quote-close').click();

  await page.locator('[data-locale="it"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#quote-trigger')).toContainText(/preventivo/i);
  await expect(page.locator('#product-rows tr[data-sku="5430004174240"] [data-format-select]')).toHaveValue('5430004174240');
  await page.screenshot({ path: 'qa-screenshots/desktop-buyer.png' });
});

test('product card uses master technical data for the selected format', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html');
  const { dialog } = await openOfficialProduct(page, 'summer truffle carpaccio|45g');

  await expect(dialog.locator('#product-detail-title')).toContainText(/Summer Truffle Carpaccio/i);
  await expect(dialog).toHaveAttribute('data-shopify-match', 'fallback-verified');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174417');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /houseoftartufo\.com\/products\/summer-truffle-carpaccio/);
  await expect(dialog).toContainText(/Summer truffle.*60%.*water.*flavouring/i);
  await expect(dialog).toContainText('05430004174417');
  await expect(dialog).toContainText(/36 months/i);
  await expect(dialog).toContainText(/Nutrition/i);
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  await page.screenshot({ path: 'qa-screenshots/product-detail-desktop.png' });
  await dialog.locator('[data-product-detail-close]').click();
});

test('official SKU, pack and Shopify mappings stay exact after format switching', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/preview.html');

  const checks = [
    ['truffled sauce summer truffle 5%|80g', '5430004174103', '12'],
    ['truffled sauce summer truffle 5%|500g', '5430004174127', '6'],
    ['tartufata white sauce with bianchetto 2%|500g', '5430004174240', '6'],
    ['butter with bianchetto truffle 6%|80g', '5430004174486', '12'],
    ['white truffle extra virgin olive oil|100ml', '5430004174493', '12'],
    ['white truffle extra virgin olive oil|5000ml', '5430004174035', '4'],
  ] as const;

  for (const [officialKey, expectedSku, expectedCasePack] of checks) {
    const { dialog } = await openOfficialProduct(page, officialKey);
    await expect(dialog.locator('[data-official-sku]')).toHaveText(expectedSku);
    await expect(dialog.locator('.product-detail-specs .product-detail-spec').nth(2)).toContainText(expectedCasePack);
    await expect(dialog).toContainText(/Ingredients|Ingredienti/i);
    await expect(dialog).toHaveAttribute('data-shopify-match', 'fallback-verified');
    await expect(dialog.locator('.product-detail-source')).toHaveCount(1);
    await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));
    await dialog.locator('[data-product-detail-close]').click();
  }
});

test('master-only products remain complete and safe inside grouped catalogue', async ({ page }) => {
  await page.goto('/preview.html');

  const pesto = (await openOfficialProduct(page, 'genovese pesto|80g')).dialog;
  await expect(pesto).toHaveAttribute('data-shopify-match', 'master-only');
  await expect(pesto.locator('.product-detail-source')).toHaveCount(0);
  await expect(pesto.locator('[data-product-detail-main-image]')).toHaveCount(0);
  await expect(pesto.locator('[data-official-sku]')).toHaveText('5430004174509');
  await expect(pesto).toContainText(/Genovese basil/i);
  await pesto.locator('[data-product-detail-close]').click();

  const pearls = (await openOfficialProduct(page, 'balsamic vinegar pearls|50ml')).dialog;
  await expect(pearls).toHaveAttribute('data-shopify-match', 'master-only');
  await expect(pearls.locator('[data-official-sku]')).toHaveText('5430004174578');
  await expect(pearls).toContainText(/Modena Balsamic Vinegar/i);
  await pearls.locator('[data-product-detail-close]').click();
});

test('selectors expose every official format and never invent non-master sizes', async ({ page }) => {
  await page.goto('/preview.html');

  const rows = await waitForGroupedCatalogue(page);
  const representedVariants = await rows.evaluateAll((items) =>
    items.reduce((total, row) => {
      const selector = row.querySelector('select[data-format-select]') as HTMLSelectElement | null;
      return total + (selector ? selector.options.length : 1);
    }, 0),
  );
  expect(representedVariants).toBe(55);

  const whiteOilSelect = page.locator('#product-rows tr[data-product-family="White Truffle Extra Virgin Olive Oil"] [data-format-select]');
  await expect(whiteOilSelect.locator('option')).toHaveText(['100ml', '250ml', '1L', '3L', '5L']);
  const honeySelect = page.locator('#product-rows tr[data-product-family="Acacia Honey with Truffle"] [data-format-select]');
  await expect(honeySelect.locator('option')).toHaveText(['110g', '220g', '650g']);
  await expect(page.locator('#product-rows')).not.toContainText(/Pure White Truffle Cream/i);
});

test('price-pending formats stay selectable and clickable but cannot enter a quote', async ({ page }) => {
  await page.goto('/preview.html');

  const blackOil1L = await selectOfficialVariant(page, 'black truffle extra virgin olive oil|1000ml');
  await expect(blackOil1L).toHaveAttribute('data-order-status', 'standby');
  await expect(blackOil1L.locator('[data-add-quote]:not(:disabled)')).toHaveCount(0);
  await expect(blackOil1L.locator('[data-qty-input]')).toHaveCount(0);
  await expect(blackOil1L).toContainText(/Price pending|Prezzo in attesa/i);
  await blackOil1L.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174462');
  await expect(dialog).toContainText(/Extra virgin olive oil/i);
  await dialog.locator('[data-product-detail-close]').click();

  const cashews = await selectOfficialVariant(page, 'truffle cashews|80g');
  await expect(cashews).toHaveAttribute('data-order-status', 'standby');
  await expect(cashews).toContainText(/Price pending|Prezzo in attesa/i);
  await expect(page.locator('#quote-count')).toHaveText('0');
});

test('product detail card stays contained on mobile after format selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview.html');
  const { dialog } = await openOfficialProduct(page, 'summer truffle carpaccio|170g');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174424');
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width ?? 9999).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'qa-screenshots/product-detail-mobile-390.png' });
});

for (const width of [320, 360, 390, 430]) {
  test(`${width}px mobile keeps format selector, languages and quote controls usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/preview.html');
    await waitForGroupedCatalogue(page);

    await expect(page.locator('[data-locale="en"]')).toBeVisible();
    await expect(page.locator('[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('#quote-trigger')).toBeVisible();
    await expect(page.locator('#catalogue-search')).toBeVisible();

    const carpaccio = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
    await expect(carpaccio.locator('[data-format-select]')).toBeVisible();
    const selectorBox = await carpaccio.locator('[data-format-select]').boundingBox();
    expect(selectorBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const row = await selectOfficialVariant(page, 'butter with bianchetto truffle 6%|80g');
    await expect(row).toHaveAttribute('data-order-status', 'orderable');
    const decrementBox = await row.locator('[data-qty-action="decrement"]').boundingBox();
    const incrementBox = await row.locator('[data-qty-action="increment"]').boundingBox();
    expect(decrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(incrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.locator('[data-locale="fr"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"] [data-format-select]')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `qa-screenshots/mobile-${width}.png` });
  });
}
