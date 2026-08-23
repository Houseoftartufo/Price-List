import type { Env } from '../env';
import type { CanonicalQuote } from '../types';

type EmailBinding = {
  send(message: {
    to?: string | null;
    from: string;
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<unknown>;
};

type AdminEnv = Env & {
  ADMIN_EMAIL?: EmailBinding;
  ADMIN_EMAIL_TO?: string;
  ADMIN_FROM_EMAIL?: string;
};

function textSummary(quote: CanonicalQuote): string {
  const customer = quote.customer;
  const lines = quote.lines.map((line) => [
    `${line.sku} · ${line.name}`,
    `${line.cases} case(s) × ${line.unitsPerCase} unit(s)`,
    `€${line.finalUnitPriceExVat.toFixed(2)}/unit ex VAT`,
    `€${line.subtotalExVat.toFixed(2)} subtotal`,
    `Stock: ${line.availability}`,
  ].join(' · ')).join('\n');

  return [
    `House of Tartufo Price List quotation request`,
    `Reference: ${quote.quoteId}`,
    `Created: ${quote.createdAt}`,
    `Language: ${quote.locale.toUpperCase()}`,
    `Preferred channel: ${quote.preferredChannel}`,
    '',
    `Customer type: ${customer.type}`,
    customer.companyName ? `Company: ${customer.companyName}` : undefined,
    customer.vatNumber ? `VAT: ${customer.vatNumber}` : undefined,
    `Contact: ${customer.firstName} ${customer.lastName}`,
    `Email: ${customer.email}`,
    `Phone: ${customer.phone}`,
    `Billing: ${customer.street} ${customer.streetNumber}${customer.addressLine2 ? `, ${customer.addressLine2}` : ''}, ${customer.postalCode} ${customer.city}, ${customer.countryCode}`,
    '',
    lines,
    '',
    `TOTAL EX VAT: €${quote.totalExVat.toFixed(2)}`,
  ].filter((value): value is string => Boolean(value)).join('\n');
}

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function notifyAdmin(env: Env, quote: CanonicalQuote): Promise<string> {
  const adminEnv = env as AdminEnv;
  const to = adminEnv.ADMIN_EMAIL_TO || 'admin@houseoftartufo.com';
  const from = adminEnv.ADMIN_FROM_EMAIL || 'quotes@houseoftartufo.com';
  const subject = `${quote.quoteId} · New Price List quotation · €${quote.totalExVat.toFixed(2)} ex VAT`;
  const text = textSummary(quote);

  if (adminEnv.ADMIN_EMAIL) {
    await adminEnv.ADMIN_EMAIL.send({
      to,
      from,
      replyTo: quote.customer.email,
      subject,
      text,
      html: `<pre style="font-family:Inter,Arial,sans-serif;white-space:pre-wrap">${htmlEscape(text)}</pre>`,
    });
    return `email:${to}`;
  }

  if (env.ADMIN_NOTIFICATION_WEBHOOK) {
    const response = await fetch(env.ADMIN_NOTIFICATION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.quoteId, to, subject, text, quote }),
    });
    if (!response.ok) throw new Error(`Admin notification webhook HTTP ${response.status}.`);
    return `webhook:${response.status}`;
  }

  throw new Error('No admin notification transport is configured.');
}
