import { expect, test } from '@playwright/test';

test.describe('German Price List locale', () => {
  test('switches the buyer UI to German and keeps quote controls usable', async ({ page }) => {
    await page.goto('/preview.html');
    await page.getByRole('button', { name: 'DE', exact: true }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Großhandelskatalog');
    await expect(page.getByPlaceholder('SKU, Produkt, Format suchen…')).toBeVisible();
    await expect(page.getByRole('button', { name: /Angebot/i }).first()).toBeVisible();

    await page.locator('#quote-trigger').click();
    await expect(page.locator('#quote-dialog')).toHaveAttribute('open', '');
    await expect(page.locator('#quote-title')).toHaveText('Angebotsanfrage');
    await expect(page.locator('#quote-dialog')).toContainText('Preise ab Werk');
  });

  test('restores German from saved locale', async ({ page }) => {
    await page.goto('/preview.html');
    await page.getByRole('button', { name: 'DE', exact: true }).click();
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('#catalogue-search')).toHaveAttribute('placeholder', 'SKU, Produkt, Format suchen…');
  });
});
