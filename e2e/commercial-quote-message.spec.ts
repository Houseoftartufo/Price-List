import { expect, test, type Page } from '@playwright/test';

function whatsappMessage(href: string): string {
  return new URL(href).searchParams.get('text') ?? '';
}

function emailBody(href: string): string {
  const question = href.indexOf('?');
  return new URLSearchParams(question >= 0 ? href.slice(question + 1) : '').get('body') ?? '';
}

async function expectCommercialLinks(page: Page): Promise<{ whatsapp: string; email: string }> {
  const whatsapp = page.locator('#whatsapp-order');
  const email = page.locator('#email-order');
  await expect(whatsapp).toHaveAttribute('data-commercial-message-ready', 'true');
  await expect(email).toHaveAttribute('data-commercial-message-ready', 'true');
  return {
    whatsapp: whatsappMessage((await whatsapp.getAttribute('href')) ?? ''),
    email: emailBody((await email.getAttribute('href')) ?? ''),
  };
}

async function switchLocaleAndReopenQuote(page: Page, locale: 'it' | 'fr' | 'nl'): Promise<void> {
  await page.locator('#quote-close').click();
  await expect(page.locator('#quote-dialog')).not.toBeVisible();
  await page.locator(`[data-locale="${locale}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
}

test('quote sends a detailed and consistently localized commercial message', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const carpaccio = page.locator('#product-rows tr[data-product-family="Summer Truffle Carpaccio"]');
  await expect(carpaccio).toBeVisible();
  await carpaccio.locator('[data-format-select]').selectOption('5430004174424');

  const row = page.locator('#product-rows tr[data-sku="5430004174424"]');
  await expect(row).toBeVisible();
  const quantity = row.locator('[data-qty-input]');
  await quantity.fill('3');
  await quantity.press('Tab');
  await expect(row.locator('.discount-pill')).toContainText('10%');
  await row.locator('[data-add-quote]').click();

  await page.locator('#quote-trigger').click();
  await expect(page.locator('#quote-dialog')).toBeVisible();
  await expect(page.locator('#quote-lines')).toContainText('170g');

  let messages = await expectCommercialLinks(page);
  expect(messages.whatsapp).toContain('*HOUSE OF TARTUFO — B2B QUOTE REQUEST*');
  expect(messages.whatsapp).toContain('*1. Summer Truffle Carpaccio · 170g*');
  expect(messages.whatsapp).toContain('Quantity: 3 boxes × 12 units = 36 units');
  expect(messages.whatsapp).toContain('Volume discount: *−10%*');
  expect(messages.whatsapp).toContain('*SUMMARY*');
  expect(messages.whatsapp).toContain('Volume savings: *−');
  expect(messages.email).toContain('HOUSE OF TARTUFO — B2B QUOTE REQUEST');
  expect(messages.email).toContain('Volume discount: −10%');
  expect(messages.email).not.toContain('*');

  await switchLocaleAndReopenQuote(page, 'it');
  messages = await expectCommercialLinks(page);
  expect(messages.whatsapp).toContain('*HOUSE OF TARTUFO — RICHIESTA PREVENTIVO B2B*');
  expect(messages.whatsapp).toContain('Quantità: 3 box × 12 unità = 36 unità');
  expect(messages.whatsapp).toContain('Sconto volume: *−10%*');
  expect(messages.whatsapp).toContain('*RIEPILOGO*');
  expect(messages.email).toContain('Sconto volume: −10%');

  await switchLocaleAndReopenQuote(page, 'fr');
  messages = await expectCommercialLinks(page);
  expect(messages.whatsapp).toContain('*HOUSE OF TARTUFO — DEMANDE DE DEVIS B2B*');
  expect(messages.whatsapp).toContain('Quantité: 3 box × 12 unités = 36 unités');
  expect(messages.whatsapp).toContain('Remise volume: *−10%*');
  expect(messages.whatsapp).toContain('*RÉCAPITULATIF*');
  expect(messages.email).toContain('Remise volume: −10%');

  await switchLocaleAndReopenQuote(page, 'nl');
  messages = await expectCommercialLinks(page);
  expect(messages.whatsapp).toContain('*HOUSE OF TARTUFO — B2B OFFERTEAANVRAAG*');
  expect(messages.whatsapp).toContain('Aantal: 3 boxen × 12 eenheden = 36 eenheden');
  expect(messages.whatsapp).toContain('Volumekorting: *−10%*');
  expect(messages.whatsapp).toContain('*OVERZICHT*');
  expect(messages.email).toContain('Volumekorting: −10%');
});
