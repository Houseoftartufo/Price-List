import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

mkdirSync('qa-screenshots', { recursive: true });

const OFFICIAL_PRODUCTS = '51';
const OFFICIAL_ACTIVE_CATEGORIES = '6';
const EXPECTED_STANDBY_ROWS = 7;

async function expectLoadedProductImage(image: Locator): Promise<void> {
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
}

async function officialRow(page: Page, officialKey: string): Promise<Locator> {
  const row = page.locator(`#product-rows tr[data-official-key="${officialKey}"]`);
  await expect(row, officialKey).toBeVisible();
  return row;
}

async function openOfficialProduct(page: Page, officialKey: string): Promise<{ row: Locator; dialog: Locator }> {
  if (!page.url().includes('/preview.html')) await page.goto('/preview.html');
  const row = await officialRow(page, officialKey);
  await row.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-official-master', 'matched');
  return { row, dialog };
}

test('production homepage serves exactly the 51 official Excel variants', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.locator('#metric-products')).toHaveText(OFFICIAL_PRODUCTS);
  await expect(page.locator('#metric-categories')).toHaveText(OFFICIAL_ACTIVE_CATEGORIES);
  await expect(page.locator('#product-rows tr[data-official-master="matched"]')).toHaveCount(51);
  await expect(page.locator('#quote-trigger')).toBeVisible();

  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute('content', 'index,follow');
  await page.screenshot({ path: 'qa-screenshots/production-homepage.png' });
});

test('desktop buyer can price an orderable official variant and build a quote', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html');

  const row = await officialRow(page, 'white truffle sauce|500g');
  await expect(row).toHaveAttribute('data-order-status', 'orderable');
  await expect(row.locator('.product-name')).toHaveText('White Truffle Sauce');
  await expect(row.locator('td').nth(2)).toContainText('6');
  await expect(row.locator('.dynamic-price')).toBeVisible();

  const quantity = row.locator('[data-qty-input]');
  await quantity.fill('2');
  await quantity.press('Tab');
  await expect(row.locator('.discount-pill')).toContainText('5%');

  await row.locator('[data-add-quote]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('White Truffle Sauce');
  await expect(page.locator('#whatsapp-order')).toHaveAttribute('href', /wa\.me\/32480205715/);
  await expect(page.locator('#email-order')).toHaveAttribute('href', /^mailto:/);
  await page.locator('#quote-close').click();

  await page.locator('[data-locale="it"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#quote-trigger')).toContainText(/preventivo/i);
  await page.screenshot({ path: 'qa-screenshots/desktop-buyer.png' });
});

test('product card uses Excel ingredients and exact Shopify enrichment independently', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html');
  const { dialog } = await openOfficialProduct(page, 'summer truffle carpaccio|45g');

  await expect(dialog.locator('#product-detail-title')).toContainText(/Summer Truffle Carpaccio/i);
  await expect(dialog).toHaveAttribute('data-shopify-match', 'verified');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('Product86');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /houseoftartufo\.com\/products\/summer-truffle-carpaccio/);
  await expect(dialog).toContainText(/Summer truffle.*60%.*water.*flavouring/i);
  await expect(dialog).not.toContainText(/70%/i);
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  await page.screenshot({ path: 'qa-screenshots/product-detail-desktop.png' });
  await dialog.locator('[data-product-detail-close]').click();
});

test('official SKU, pack and Shopify mappings stay exact across product families', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/preview.html');

  const checks = [
    ['black truffle sauce 5%|80g', '5430004174103', '12'],
    ['black truffle sauce 5%|500g', '5430004174127', '6'],
    ['white truffle sauce|500g', '5430004174240', '6'],
    ['white truffle butter|80g', '5430004174486', '12'],
    ['white truffle extra virgin olive oil|100ml', '5430004174493', '12'],
    ['white truffle extra virgin olive oil|5000ml', '5430004174035', '4'],
  ] as const;

  for (const [officialKey, expectedSku, expectedCasePack] of checks) {
    const { dialog } = await openOfficialProduct(page, officialKey);
    await expect(dialog.locator('[data-official-sku]')).toHaveText(expectedSku);
    await expect(dialog.locator('.product-detail-specs .product-detail-spec').nth(2)).toContainText(expectedCasePack);
    await expect(dialog).toContainText(/Ingredients/i);
    await expect(dialog.locator('.product-detail-source')).toHaveCount(1);
    await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));
    await dialog.locator('[data-product-detail-close]').click();
  }
});

test('official variants without a safe Shopify match still show only Excel ingredients', async ({ page }) => {
  await page.goto('/preview.html');

  const sauce = (await openOfficialProduct(page, 'black truffle sauce 10%|170g')).dialog;
  await expect(sauce).toHaveAttribute('data-shopify-match', 'official');
  await expect(sauce.locator('.product-detail-source')).toHaveCount(0);
  await expect(sauce.locator('[data-product-detail-main-image]')).toHaveCount(0);
  await expect(sauce).toContainText(/summer truffle 10%/i);
  await sauce.locator('[data-product-detail-close]').click();

  const mayo = (await openOfficialProduct(page, 'black truffle mayonnaise|120g')).dialog;
  await expect(mayo).toHaveAttribute('data-shopify-match', 'official');
  await expect(mayo).toContainText(/pasteurised EGG/i);
  await expect(mayo).not.toContainText(/almond/i);
  await expect(mayo.locator('.product-detail-source')).toHaveCount(0);
  await mayo.locator('[data-product-detail-close]').click();
});

test('products outside the two official Excel files never appear in the buyer catalogue', async ({ page }) => {
  await page.goto('/preview.html');
  const officialRows = page.locator('#product-rows tr[data-official-key]');
  await expect(officialRows).toHaveCount(51);

  const rendered = await officialRows.evaluateAll((rows) =>
    rows.map((row) => ({
      key: (row as HTMLElement).dataset.officialKey,
      name: row.querySelector('.product-name')?.textContent?.trim(),
      size: row.querySelectorAll('td')[1]?.textContent?.trim(),
    })),
  );

  expect(rendered).toHaveLength(51);
  expect(rendered).not.toContainEqual(expect.objectContaining({ name: 'White Truffle Sauce', size: '80g' }));
  expect(rendered).not.toContainEqual(expect.objectContaining({ name: 'White Truffle Extra Virgin Olive Oil', size: '500ml' }));
  expect(rendered).not.toContainEqual(expect.objectContaining({ name: 'Acacia Honey With Truffle', size: '650g' }));
  expect(rendered.some((row) => /Tarallini/i.test(row.name ?? ''))).toBe(false);
  expect(rendered.some((row) => /Pure White Truffle Cream/i.test(row.name ?? ''))).toBe(false);
});

test('all incomplete official variants stay visible and clickable but cannot enter a quote', async ({ page }) => {
  await page.goto('/preview.html');

  const standbyRows = page.locator('#product-rows tr[data-order-status="standby"]');
  await expect(standbyRows).toHaveCount(EXPECTED_STANDBY_ROWS);

  const standbyKeys = await standbyRows.evaluateAll((rows) =>
    rows.map((row) => (row as HTMLElement).dataset.officialKey).filter(Boolean).sort(),
  );
  expect(standbyKeys).toEqual([
    'acacia honey with truffle|450g',
    'black truffle extra virgin olive oil|60ml',
    'salt with summer truffle|120g',
    'salt with summer truffle|30g',
    'truffle almonds|80g',
    'truffle cashew|80g',
    'truffle walnuts|80g',
  ].sort());

  const salt120 = await officialRow(page, 'salt with summer truffle|120g');
  await expect(salt120).toHaveAttribute('data-order-status', 'standby');
  await expect(salt120.locator('[data-add-quote]')).toHaveCount(0);
  await expect(salt120.locator('[data-qty-input]')).toHaveCount(0);
  await expect(salt120).toContainText(/Case pack pending/i);
  await salt120.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Ingredients/i);
  await dialog.locator('[data-product-detail-close]').click();

  const cashew = await officialRow(page, 'truffle cashew|80g');
  await expect(cashew).toHaveAttribute('data-order-status', 'standby');
  await expect(cashew).toContainText(/Price pending/i);
  await expect(page.locator('#quote-count')).toHaveText('0');
});

test('product detail card stays contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview.html');
  const { dialog } = await openOfficialProduct(page, 'summer truffle carpaccio|45g');
  await expect(dialog).toHaveAttribute('data-shopify-match', 'verified');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('Product86');
  await expect(dialog).toContainText(/Summer truffle.*60%.*water.*flavouring/i);
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.width ?? 9999).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'qa-screenshots/product-detail-mobile-390.png' });
});

for (const width of [320, 360, 390, 430]) {
  test(`${width}px mobile keeps languages, buyer controls and horizontal layout safe`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/preview.html');

    await expect(page.locator('[data-locale="en"]')).toBeVisible();
    await expect(page.locator('[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('#quote-trigger')).toBeVisible();
    await expect(page.locator('#catalogue-search')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const row = await officialRow(page, 'black truffle butter|80g');
    const decrementBox = await row.locator('[data-qty-action="decrement"]').boundingBox();
    const incrementBox = await row.locator('[data-qty-action="increment"]').boundingBox();
    expect(decrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(incrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.locator('[data-locale="fr"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.screenshot({ path: `qa-screenshots/mobile-${width}.png` });
  });
}
