import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

mkdirSync('qa-screenshots', { recursive: true });

const OFFICIAL_ORDERABLE_PRODUCTS = '43';
const OFFICIAL_ACTIVE_CATEGORIES = '6';

async function expectLoadedProductImage(image: Locator): Promise<void> {
  await expect(image).toBeVisible();
  await expect.poll(async () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
}

async function openProductDetails(page: Page, catalogueCode: string): Promise<Locator> {
  await page.goto(`/preview.html?sku=${catalogueCode}`);
  const row = page.locator(`tr[data-sku="${catalogueCode}"]`);
  await expect(row).toBeVisible();
  await row.locator('.product-cell').click();
  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-official-master', 'matched');
  return dialog;
}

test('production homepage serves only the official Excel-backed catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?sku=29');

  await expect(page.locator('#metric-products')).toHaveText(OFFICIAL_ORDERABLE_PRODUCTS);
  await expect(page.locator('#metric-categories')).toHaveText(OFFICIAL_ACTIVE_CATEGORIES);
  await expect(page.locator('tr[data-sku="29"]')).toBeVisible();
  await expect(page.locator('#quote-trigger')).toBeVisible();

  // These rows exist in the old commercial sheet but are not in the two official Excel files.
  for (const excludedCode of ['15', '27', '60', '83', '136', '151']) {
    await expect(page.locator(`tr[data-sku="${excludedCode}"]`)).toHaveCount(0);
  }

  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute('content', 'index,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://houseoftartufo-price-list.vercel.app/',
  );

  await page.screenshot({ path: 'qa-screenshots/production-homepage.png' });
});

test('desktop buyer can price an official variant and build a quote', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/preview.html?sku=29');

  await expect(page.locator('#metric-products')).toHaveText(OFFICIAL_ORDERABLE_PRODUCTS);
  await expect(page.locator('#metric-categories')).toHaveText(OFFICIAL_ACTIVE_CATEGORIES);

  const row = page.locator('tr[data-sku="29"]');
  await expect(row).toBeVisible();
  await expect(row.locator('.dynamic-price')).toBeVisible();

  // Official box cross-check: White Truffle Sauce 500g is 6 units/box, not the old 12.
  const cells = row.locator('td');
  await expect(cells.nth(2)).toContainText('6');

  const quantity = row.locator('[data-qty-input="29"]');
  await quantity.fill('2');
  await quantity.press('Tab');
  await expect(row.locator('.discount-pill')).toContainText('5%');

  await row.locator('[data-add-quote="29"]').click();
  await expect(page.locator('#quote-count')).toHaveText('1');

  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('SKU 29');
  await expect(page.locator('#whatsapp-order')).toHaveAttribute('href', /wa\.me\/32480205715/);
  await expect(page.locator('#email-order')).toHaveAttribute('href', /^mailto:/);
  await page.locator('#quote-close').click();

  await page.locator('[data-locale="it"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('#quote-trigger')).toContainText(/preventivo/i);

  await page.screenshot({ path: 'qa-screenshots/desktop-buyer.png' });
});

test('clicking an official product opens the same premium card with Excel ingredients and exact Shopify enrichment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const dialog = await openProductDetails(page, '87');

  await expect(dialog.locator('#product-detail-title')).toContainText(/Summer Truffle Carpaccio/i);
  await expect(dialog).toHaveAttribute('data-shopify-match', 'verified');
  await expect(dialog).toContainText(/Catalogue code/i);
  await expect(dialog.locator('[data-official-sku]')).toHaveText('Product86');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /houseoftartufo\.com\/products\/summer-truffle-carpaccio/);
  await expect(dialog).toContainText(/Ingredients/i);
  await expect(dialog).toContainText(/Summer truffle.*60%.*water.*flavouring/i);
  await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));

  await page.screenshot({ path: 'qa-screenshots/product-detail-desktop.png' });
  await dialog.locator('[data-product-detail-close]').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('tr[data-sku="87"]')).toBeVisible();
  await expect(page.locator('#quote-count')).toHaveText('0');
});

test('official SKU, pack and Shopify mappings stay exact across product families', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  const checks = [
    ['18', '5430004174103', '12'],
    ['20', '5430004174127', '6'],
    ['29', '5430004174240', '6'],
    ['49', '5430004174486', '12'],
    ['58', '5430004174493', '12'],
    ['62', '5430004174035', '4'],
  ] as const;

  for (const [catalogueCode, expectedSku, expectedCasePack] of checks) {
    const dialog = await openProductDetails(page, catalogueCode);
    await expect(dialog.locator('[data-official-sku]')).toHaveText(expectedSku);
    await expect(dialog.locator('.product-detail-specs .product-detail-spec').nth(2)).toContainText(expectedCasePack);
    await expect(dialog).toContainText(/Ingredients/i);
    await expect(dialog.locator('.product-detail-source')).toHaveCount(1);
    await expectLoadedProductImage(dialog.locator('[data-product-detail-main-image]'));
    await dialog.locator('[data-product-detail-close]').click();
  }
});

test('products outside the two official Excel files never appear in the buyer catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/preview.html');

  const excludedCodes = [
    '1',   // Bolognese Ragout
    '15',  // 3% black sauce
    '27',  // White sauce 80g
    '60',  // White EVOO 500ml
    '83',  // Pure White Truffle Cream 80g
    '94',  // Whole Summer Truffle in brine
    '117', // White Truffle Tagliatelle
    '136', // Honey 650g
    '151', // Natural Line Carpaccio
  ];

  for (const code of excludedCodes) {
    await expect(page.locator(`tr[data-sku="${code}"]`)).toHaveCount(0);
  }
});

test('product detail card stays contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openProductDetails(page, '87');
  await expect(dialog).toHaveAttribute('data-shopify-match', 'verified');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('Product86');
  await expect(dialog).toContainText(/Ingredients/i);
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
    await page.goto('/preview.html?sku=46');

    await expect(page.locator('[data-locale="en"]')).toBeVisible();
    await expect(page.locator('[data-locale="fr"]')).toBeVisible();
    await expect(page.locator('#quote-trigger')).toBeVisible();
    await expect(page.locator('#catalogue-search')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    const row = page.locator('tr[data-sku="46"]');
    await expect(row).toBeVisible();
    const decrement = row.locator('[data-qty-action="decrement"]');
    const increment = row.locator('[data-qty-action="increment"]');
    const decrementBox = await decrement.boundingBox();
    const incrementBox = await increment.boundingBox();
    expect(decrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(incrementBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.locator('[data-locale="fr"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    await page.screenshot({ path: `qa-screenshots/mobile-${width}.png` });
  });
}
