import { expect, test } from '@playwright/test';

const frenchTranslation = {
  available: true,
  locale: 'fr',
  product: {
    handle: 'summer-truffle-carpaccio',
    title: 'Carpaccio de Truffes d’Été',
    translated: true,
    translationAvailable: true,
  },
};

test('official transparent dark logo replaces provisional marks on current light surfaces', async ({ page, request }) => {
  await page.goto('/preview.html');

  const headerLogo = page.locator('.site-header .brand-logo');
  const footerLogo = page.locator('.site-footer .brand-logo');
  await expect(headerLogo).toBeVisible();
  await expect(footerLogo).toBeVisible();
  await expect(headerLogo).toHaveAttribute('src', '/brand/house-of-tartufo-logo-dark.png');
  await expect(footerLogo).toHaveAttribute('src', '/brand/house-of-tartufo-logo-dark.png');
  await expect(page.locator('.brand-mark')).toHaveCount(0);
  await expect(page.locator('.brand-words')).toHaveCount(0);

  const dark = await request.get('/brand/house-of-tartufo-logo-dark.png');
  expect(dark.ok()).toBeTruthy();
  expect(dark.headers()['content-type']).toContain('image/png');
});

test('French product detail uses translated official master content and never leaks Italian copy', async ({ page }) => {
  await page.route('**/api/shopify-product-translation?**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('locale') === 'fr') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(frenchTranslation) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ available: false }) });
  });

  await page.goto('/preview.html');
  const familyRow = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(familyRow).toBeVisible();
  await familyRow.locator('[data-format-select]').selectOption('5430004174387');

  await page.locator('[data-locale="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', /^fr/i);

  const row = page.locator('#product-rows tr[data-sku="5430004174387"]');
  await expect(row).toBeVisible();
  await expect(row.locator('[data-format-select]')).toHaveValue('5430004174387');
  await row.locator('.product-cell').click();

  const dialog = page.locator('#product-detail-dialog');
  const sections = dialog.locator('.product-detail-sections');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.product-detail-title')).toHaveText('Carpaccio de Truffes d’Été');
  await expect(dialog.locator('[data-official-sku]')).toHaveText('5430004174387');
  await expect(dialog).toHaveAttribute('data-product-content-locale', 'fr');
  await expect(dialog).toHaveAttribute('data-product-content-translated', 'true');

  await expect(sections).toContainText('Ingrédients');
  await expect(sections).toContainText('Truffe d’été');
  await expect(sections).toContainText('Allergènes');
  await expect(sections).toContainText('Aucun');
  await expect(sections).toContainText('Utilisation');
  await expect(sections).toContainText('Une fois ouvert');
  await expect(sections).toContainText('Conservation');
  await expect(sections).toContainText('Conserver à température ambiante');
  await expect(sections).toContainText('Informations produit');
  await expect(sections).toContainText('Italie');
  await expect(sections).toContainText('Durée de conservation');
  await expect(sections).toContainText('36 mois');
  await expect(sections).toContainText('Énergie');
  await expect(sections).toContainText('Matières grasses');

  await expect(sections).not.toContainText('Tartufo estivo');
  await expect(sections).not.toContainText('Nessuno');
  await expect(sections).not.toContainText('Una volta aperto');
  await expect(sections).not.toContainText('Conservare a temperatura');
  await expect(sections).not.toContainText('36 months');

  await expect(dialog.locator('[data-product-detail-quote]')).toHaveText('Ajouter au devis');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /\/fr\/products\/summer-truffle-carpaccio/);
});
