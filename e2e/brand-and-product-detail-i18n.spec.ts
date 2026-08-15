import { expect, test } from '@playwright/test';

const frenchTranslation = {
  available: true,
  locale: 'fr',
  product: {
    handle: 'summer-truffle-carpaccio',
    title: 'Carpaccio de Truffes d’Été',
    descriptionHtml: `
      <h3>Ingrédients</h3><p>Truffe d’été (Tuber aestivum Vittad.) 60 %, eau, arôme.</p>
      <h3>Allergènes</h3><p>Aucun</p>
      <h3>Comment utiliser</h3><p>Une fois ouvert, le produit est prêt à être utilisé ou consommé.</p>
      <h3>Conservation</h3><p>Conserver à température ambiante, à l’abri de la lumière et des sources de chaleur. Après ouverture, conserver entre 0 et 4 °C.</p>
    `,
    translated: true,
    translationAvailable: true,
    translatedFields: { title: true, bodyHtml: true },
  },
};

test('official transparent logo masters replace provisional marks without changing layout surfaces', async ({ page, request }) => {
  await page.goto('/preview.html');

  const headerLogo = page.locator('.site-header .brand-logo');
  const footerLogo = page.locator('.site-footer .brand-logo');
  await expect(headerLogo).toBeVisible();
  await expect(footerLogo).toBeVisible();
  await expect(headerLogo).toHaveAttribute('src', '/brand/house-of-tartufo-logo-dark.webp');
  await expect(footerLogo).toHaveAttribute('src', '/brand/house-of-tartufo-logo-dark.webp');
  await expect(page.locator('.brand-mark')).toHaveCount(0);
  await expect(page.locator('.brand-words')).toHaveCount(0);

  const dark = await request.get('/brand/house-of-tartufo-logo-dark.webp');
  const white = await request.get('/brand/house-of-tartufo-logo-white.webp');
  expect(dark.ok()).toBeTruthy();
  expect(white.ok()).toBeTruthy();
  expect(dark.headers()['content-type']).toContain('image/webp');
  expect(white.headers()['content-type']).toContain('image/webp');
});

test('French product detail uses the selected locale and never leaks Italian master copy', async ({ page }) => {
  await page.route('**/api/shopify-product-translation?**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('locale') === 'fr') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(frenchTranslation) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ available: false }) });
  });

  await page.goto('/preview.html');
  await page.locator('[data-locale="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', /^fr/i);

  const row = page.locator('#product-rows tr[data-official-key="summer truffle carpaccio|80g"]');
  await expect(row).toBeVisible();
  await row.locator('.product-cell').click();

  const dialog = page.locator('#product-detail-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.product-detail-title')).toHaveText('Carpaccio de Truffes d’Été');
  await expect(dialog).toHaveAttribute('data-product-content-locale', 'fr');
  await expect(dialog).toHaveAttribute('data-product-content-translated', 'true');
  await expect(dialog.locator('.product-detail-sections')).toContainText('Ingrédients');
  await expect(dialog.locator('.product-detail-sections')).toContainText('Comment utiliser');
  await expect(dialog.locator('.product-detail-sections')).toContainText('Conservation');
  await expect(dialog.locator('.product-detail-sections')).toContainText('Informations produit');
  await expect(dialog.locator('.product-detail-sections')).toContainText('Durée de conservation');
  await expect(dialog.locator('.product-detail-sections')).not.toContainText('Una volta aperto');
  await expect(dialog.locator('.product-detail-sections')).not.toContainText('Conservare a temperatura');
  await expect(dialog.locator('[data-product-detail-quote]')).toHaveText('Ajouter au devis');
  await expect(dialog.locator('.product-detail-source')).toHaveAttribute('href', /\/fr\/products\/summer-truffle-carpaccio/);
});
