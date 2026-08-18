import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, query: string): Promise<void> {
  const input = page.locator('#catalogue-search');
  await input.fill(query);
  await expect(input).toHaveValue(query);
}

async function expectVisibleProduct(page: Page, productText: string): Promise<void> {
  await expect(page.locator('#product-rows tr:not([hidden])').filter({ hasText: productText }).first()).toBeVisible();
}

test('universal product search understands product concepts across languages', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await search(page, 'salsa');
  await expectVisibleProduct(page, 'Truffled Sauce');

  await search(page, 'huile truffe blanche');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'olio tartufo bianco');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'witte truffel olie');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'aceite trufa blanca');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'azeite trufa branca');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'olej biala trufla');
  await expectVisibleProduct(page, 'White Truffle Extra Virgin Olive Oil');
});

test('universal product search tolerates useful typos and searches technical content', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await search(page, 'carpacio');
  await expectVisibleProduct(page, 'Summer Truffle Carpaccio');

  await search(page, 'porcini');
  await expectVisibleProduct(page, 'Porcini Mushroom Cream with Summer Truffle');

  await search(page, 'salsa 500g');
  await expectVisibleProduct(page, 'Truffled Sauce');
});

test('exact SKU search reveals and selects the requested grouped format', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await search(page, '5430004174424');
  const exact = page.locator('#product-rows tr[data-sku="5430004174424"]');
  await expect(exact).toBeVisible();
  await expect(exact.locator('[data-format-select]')).toHaveValue('5430004174424');
});

test('universal query survives direct URL loading and language changes', async ({ page }) => {
  await page.goto('/preview.html?q=salsa');
  await expect(page.locator('#catalogue-search')).toHaveValue('salsa');
  await expectVisibleProduct(page, 'Truffled Sauce');

  await page.locator('[data-locale="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('#catalogue-search')).toHaveValue('salsa');
  await expectVisibleProduct(page, 'Truffled Sauce');
});
