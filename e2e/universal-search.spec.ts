import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, query: string): Promise<void> {
  const input = page.locator('#catalogue-search');
  await input.fill(query);
  await expect(input).toHaveValue(query);
}

async function expectFamilyVisible(page: Page, family: string): Promise<void> {
  const grouped = page.locator(`#product-rows tr[data-product-family="${family}"]`);
  if (await grouped.count()) {
    await expect(grouped).toBeVisible();
    return;
  }
  await expect(page.locator('#product-rows tr:not([hidden])').filter({ hasText: family }).first()).toBeVisible();
}

test('universal product search understands product concepts across languages', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await search(page, 'salsa');
  await expectFamilyVisible(page, 'Black Truffle Sauce');

  await search(page, 'huile truffe blanche');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'olio tartufo bianco');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'witte truffel olie');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'aceite trufa blanca');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'azeite trufa branca');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');

  await search(page, 'olej biala trufla');
  await expectFamilyVisible(page, 'White Truffle Extra Virgin Olive Oil');
});

test('universal product search tolerates useful typos and searches technical content', async ({ page }) => {
  await page.goto('/preview.html');
  await expect(page.locator('#product-rows tr[data-sku]').first()).toBeVisible();

  await search(page, 'carpacio');
  await expectFamilyVisible(page, 'Summer Truffle Carpaccio');

  await search(page, 'porcini');
  await expectFamilyVisible(page, 'Porcini Mushroom Cream with Summer Truffle');

  await search(page, 'salsa 500g');
  await expectFamilyVisible(page, 'Black Truffle Sauce');
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
  await expectFamilyVisible(page, 'Black Truffle Sauce');

  await page.locator('[data-locale="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('#catalogue-search')).toHaveValue('salsa');
  await expectFamilyVisible(page, 'Black Truffle Sauce');
});
