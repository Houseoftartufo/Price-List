import { expect, test } from '@playwright/test';

const snackProducts = [
  'Truffle Cashews',
  'Truffle Almonds',
  'Truffle Walnuts',
] as const;

test('groups nuts and tarallini under the public Snacks category', async ({ page }) => {
  await page.goto('/');

  const snacks = page.locator('[data-category="Snacks"]');
  await expect(snacks).toBeVisible();
  await expect(snacks).toHaveText('Snacks');

  for (const product of snackProducts) {
    const row = page.locator('#product-rows tr').filter({ hasText: product });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Snacks');
    await expect(row).not.toContainText('Salts & Honey');
  }

  const tarallini = page.locator('#product-rows tr').filter({ hasText: /Tarallini/i });
  await expect(tarallini.first()).toBeVisible();
  await expect(tarallini.first()).toContainText('Snacks');
  await expect(tarallini.first()).not.toContainText('Pasta & Meals');

  await snacks.click();
  for (const product of snackProducts) {
    await expect(page.locator('#product-rows tr').filter({ hasText: product })).toBeVisible();
  }
  await expect(tarallini.first()).toBeVisible();
});
