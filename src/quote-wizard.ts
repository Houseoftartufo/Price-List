import './styles/quote-wizard.css';

import {
  buildChannelMessage,
  currentQuoteLocale,
  idempotencyKeyFor,
  normalizeEmail,
  normalizePhone,
  quoteEngineConfig,
  readQuoteLines,
  submitQuote,
  type QuoteChannel,
  type QuoteCustomerInput,
  type QuoteLocale,
} from './quote-engine-client';

const HOT_WHATSAPP = '32480205715';
const HOT_EMAIL = 'admin@houseoftartufo.com';

const COUNTRY_CODES = [
  'BE', 'FR', 'NL', 'LU', 'DE', 'CH', 'IT', 'AT', 'ES', 'PT', 'GB', 'IE',
  'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR',
  'HR', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'US', 'CA', 'AE', 'QA', 'SA',
  'JP', 'SG', 'AU', 'NZ', 'AL', 'AD', 'BA', 'ME', 'MK', 'RS', 'TR', 'UA',
  'MD', 'GE', 'AM', 'AZ', 'IL', 'MA', 'TN', 'EG', 'ZA', 'BR', 'MX', 'AR',
  'CL', 'CO', 'PE', 'IN', 'CN', 'HK', 'KR', 'TH', 'VN', 'MY', 'ID', 'PH',
] as const;

interface Copy {
  title: string;
  intro: string;
  company: string;
  private: string;
  companyName: string;
  vat: string;
  firstName: string;
  lastName: string;
  country: string;
  email: string;
  phone: string;
  phoneHint: string;
  billingAddress: string;
  street: string;
  number: string;
  address2: string;
  postal: string;
  city: string;
  submitWhatsApp: string;
  submitEmail: string;
  privacy: string;
  requiredCompany: string;
  requiredVat: string;
  invalidPhone: string;
  invalidEmail: string;
  noProducts: string;
  apiMissing: string;
  sending: string;
  accepted: string;
  failed: string;
  close: string;
}

const COPY: Record<QuoteLocale, Copy> = {
  en: {
    title: 'Your quotation details',
    intro: 'Add the billing details once. We verify the quote server-side before opening your selected contact channel.',
    company: 'Company', private: 'Private individual', companyName: 'Company legal name', vat: 'VAT number',
    firstName: 'First name', lastName: 'Last name', country: 'Country', email: 'Email', phone: 'Phone / WhatsApp',
    phoneHint: 'International format, e.g. +32470123456', billingAddress: 'Billing address', street: 'Street', number: 'Number',
    address2: 'Address line 2 (optional)', postal: 'Postal code', city: 'City', submitWhatsApp: 'Continue on WhatsApp',
    submitEmail: 'Continue by email', privacy: 'Used only to prepare and answer this quotation request. No marketing consent is added.',
    requiredCompany: 'Company name is required.', requiredVat: 'VAT number is required for a company request.',
    invalidPhone: 'Use an international phone number beginning with +.', invalidEmail: 'Enter a valid email address.',
    noProducts: 'Your quote is empty.', apiMissing: 'The new quotation service is not configured yet.', sending: 'Verifying prices and availability…',
    accepted: 'Request registered. Opening your selected contact channel…', failed: 'We could not verify the quotation. Please try again.', close: 'Close',
  },
  it: {
    title: 'I tuoi dati per il preventivo',
    intro: 'Inserisci una sola volta i dati di fatturazione. Verifichiamo il preventivo lato server prima di aprire il canale scelto.',
    company: 'Azienda', private: 'Privato', companyName: 'Ragione sociale', vat: 'Partita IVA',
    firstName: 'Nome', lastName: 'Cognome', country: 'Paese', email: 'Email', phone: 'Telefono / WhatsApp',
    phoneHint: 'Formato internazionale, es. +393331234567', billingAddress: 'Indirizzo di fatturazione', street: 'Via', number: 'Numero',
    address2: 'Riga indirizzo 2 (opzionale)', postal: 'CAP', city: 'Città', submitWhatsApp: 'Continua su WhatsApp',
    submitEmail: 'Continua via email', privacy: 'I dati servono solo per preparare e rispondere a questa richiesta. Nessun consenso marketing viene aggiunto.',
    requiredCompany: 'La ragione sociale è obbligatoria.', requiredVat: 'La Partita IVA è obbligatoria per una richiesta aziendale.',
    invalidPhone: 'Inserisci il telefono in formato internazionale con +.', invalidEmail: 'Inserisci un indirizzo email valido.',
    noProducts: 'Il preventivo è vuoto.', apiMissing: 'Il nuovo servizio preventivi non è ancora configurato.', sending: 'Verifica prezzi e disponibilità…',
    accepted: 'Richiesta registrata. Apro il canale scelto…', failed: 'Non siamo riusciti a verificare il preventivo. Riprova.', close: 'Chiudi',
  },
  fr: {
    title: 'Vos informations de devis',
    intro: 'Renseignez une seule fois les données de facturation. Le devis est vérifié côté serveur avant l’ouverture du canal choisi.',
    company: 'Société', private: 'Particulier', companyName: 'Raison sociale', vat: 'N° TVA',
    firstName: 'Prénom', lastName: 'Nom', country: 'Pays', email: 'E-mail', phone: 'Téléphone / WhatsApp',
    phoneHint: 'Format international, ex. +32470123456', billingAddress: 'Adresse de facturation', street: 'Rue', number: 'Numéro',
    address2: 'Complément d’adresse (facultatif)', postal: 'Code postal', city: 'Ville', submitWhatsApp: 'Continuer sur WhatsApp',
    submitEmail: 'Continuer par e-mail', privacy: 'Ces données servent uniquement à préparer et répondre à cette demande. Aucun consentement marketing n’est ajouté.',
    requiredCompany: 'La raison sociale est obligatoire.', requiredVat: 'Le N° TVA est obligatoire pour une société.',
    invalidPhone: 'Utilisez un numéro international commençant par +.', invalidEmail: 'Saisissez une adresse e-mail valide.',
    noProducts: 'Votre devis est vide.', apiMissing: 'Le nouveau service de devis n’est pas encore configuré.', sending: 'Vérification des prix et disponibilités…',
    accepted: 'Demande enregistrée. Ouverture du canal choisi…', failed: 'Impossible de vérifier le devis. Veuillez réessayer.', close: 'Fermer',
  },
  nl: {
    title: 'Uw offertegegevens',
    intro: 'Vul de factuurgegevens één keer in. We controleren de offerte server-side voordat het gekozen kanaal wordt geopend.',
    company: 'Bedrijf', private: 'Particulier', companyName: 'Officiële bedrijfsnaam', vat: 'BTW-nummer',
    firstName: 'Voornaam', lastName: 'Achternaam', country: 'Land', email: 'E-mail', phone: 'Telefoon / WhatsApp',
    phoneHint: 'Internationaal formaat, bv. +32470123456', billingAddress: 'Factuuradres', street: 'Straat', number: 'Nummer',
    address2: 'Adresregel 2 (optioneel)', postal: 'Postcode', city: 'Plaats', submitWhatsApp: 'Doorgaan via WhatsApp',
    submitEmail: 'Doorgaan per e-mail', privacy: 'Alleen gebruikt om deze offerteaanvraag voor te bereiden en te beantwoorden. Er wordt geen marketingtoestemming toegevoegd.',
    requiredCompany: 'Bedrijfsnaam is verplicht.', requiredVat: 'BTW-nummer is verplicht voor een bedrijfsaanvraag.',
    invalidPhone: 'Gebruik een internationaal nummer dat met + begint.', invalidEmail: 'Voer een geldig e-mailadres in.',
    noProducts: 'Uw offerte is leeg.', apiMissing: 'De nieuwe offerteservice is nog niet geconfigureerd.', sending: 'Prijzen en beschikbaarheid controleren…',
    accepted: 'Aanvraag geregistreerd. Het gekozen kanaal wordt geopend…', failed: 'We konden de offerte niet verifiëren. Probeer opnieuw.', close: 'Sluiten',
  },
  de: {
    title: 'Ihre Angebotsdaten',
    intro: 'Geben Sie die Rechnungsdaten einmal ein. Wir prüfen das Angebot serverseitig, bevor der gewählte Kontaktkanal geöffnet wird.',
    company: 'Unternehmen', private: 'Privatperson', companyName: 'Firmenname', vat: 'USt-IdNr.',
    firstName: 'Vorname', lastName: 'Nachname', country: 'Land', email: 'E-Mail', phone: 'Telefon / WhatsApp',
    phoneHint: 'Internationales Format, z. B. +491701234567', billingAddress: 'Rechnungsadresse', street: 'Straße', number: 'Hausnummer',
    address2: 'Adresszusatz (optional)', postal: 'Postleitzahl', city: 'Ort', submitWhatsApp: 'Weiter zu WhatsApp',
    submitEmail: 'Weiter per E-Mail', privacy: 'Die Daten werden nur zur Erstellung und Beantwortung dieser Angebotsanfrage verwendet. Es wird keine Marketingeinwilligung gesetzt.',
    requiredCompany: 'Der Firmenname ist erforderlich.', requiredVat: 'Die USt-IdNr. ist für eine Unternehmensanfrage erforderlich.',
    invalidPhone: 'Verwenden Sie eine internationale Nummer, die mit + beginnt.', invalidEmail: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    noProducts: 'Ihr Angebot ist leer.', apiMissing: 'Der neue Angebotsservice ist noch nicht konfiguriert.', sending: 'Preise und Verfügbarkeit werden geprüft…',
    accepted: 'Anfrage registriert. Der gewählte Kontaktkanal wird geöffnet…', failed: 'Das Angebot konnte nicht geprüft werden. Bitte versuchen Sie es erneut.', close: 'Schließen',
  },
};

let selectedChannel: QuoteChannel = 'whatsapp';
let dialog: HTMLDialogElement | undefined;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function countryOptions(locale: QuoteLocale): string {
  const display = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([locale], { type: 'region' }) : undefined;
  return COUNTRY_CODES
    .map((code) => ({ code, label: display?.of(code) || code }))
    .sort((left, right) => left.label.localeCompare(right.label, locale))
    .map(({ code, label }) => `<option value="${code}"${code === 'BE' ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');
}

function template(locale: QuoteLocale): string {
  const copy = COPY[locale];
  return `<div class="hot-quote-wizard__panel">
    <header class="hot-quote-wizard__header">
      <div>
        <p class="hot-quote-wizard__eyebrow">House of Tartufo · B2B</p>
        <h2 id="hot-quote-wizard-title">${escapeHtml(copy.title)}</h2>
        <p class="hot-quote-wizard__intro">${escapeHtml(copy.intro)}</p>
      </div>
      <button type="button" class="hot-quote-wizard__close" data-hot-quote-close aria-label="${escapeHtml(copy.close)}">×</button>
    </header>

    <form id="hot-quote-wizard-form" novalidate>
      <div class="hot-quote-wizard__types" role="radiogroup" aria-label="Customer type">
        <label class="hot-quote-wizard__type">
          <input type="radio" name="customerType" value="company" checked />
          <span>${escapeHtml(copy.company)}</span>
        </label>
        <label class="hot-quote-wizard__type">
          <input type="radio" name="customerType" value="private" />
          <span>${escapeHtml(copy.private)}</span>
        </label>
      </div>

      <div class="hot-quote-wizard__grid" style="margin-top:18px">
        <div class="hot-quote-wizard__field hot-quote-wizard__field--wide hot-quote-wizard__company">
          <span>${escapeHtml(copy.companyName)}</span>
          <input name="companyName" autocomplete="organization" maxlength="160" required />
        </div>
        <div class="hot-quote-wizard__field hot-quote-wizard__field--wide hot-quote-wizard__company">
          <span>${escapeHtml(copy.vat)}</span>
          <input name="vatNumber" autocomplete="off" maxlength="40" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.firstName)}</span>
          <input name="firstName" autocomplete="given-name" maxlength="80" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.lastName)}</span>
          <input name="lastName" autocomplete="family-name" maxlength="80" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.country)}</span>
          <select name="countryCode" autocomplete="country" required>${countryOptions(locale)}</select>
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.email)}</span>
          <input name="email" type="email" autocomplete="email" maxlength="254" required />
        </div>
        <div class="hot-quote-wizard__field hot-quote-wizard__field--wide">
          <span>${escapeHtml(copy.phone)}</span>
          <input name="phone" type="tel" autocomplete="tel" placeholder="+32…" maxlength="32" required />
          <small>${escapeHtml(copy.phoneHint)}</small>
        </div>
        <div class="hot-quote-wizard__field hot-quote-wizard__field--wide">
          <strong>${escapeHtml(copy.billingAddress)}</strong>
        </div>
        <div class="hot-quote-wizard__field hot-quote-wizard__field--wide">
          <span>${escapeHtml(copy.street)}</span>
          <input name="street" autocomplete="address-line1" maxlength="160" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.number)}</span>
          <input name="streetNumber" maxlength="32" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.address2)}</span>
          <input name="addressLine2" autocomplete="address-line2" maxlength="160" />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.postal)}</span>
          <input name="postalCode" autocomplete="postal-code" maxlength="32" required />
        </div>
        <div class="hot-quote-wizard__field">
          <span>${escapeHtml(copy.city)}</span>
          <input name="city" autocomplete="address-level2" maxlength="100" required />
        </div>
      </div>

      <p class="hot-quote-wizard__status" id="hot-quote-wizard-status" role="status" aria-live="polite"></p>
      <footer class="hot-quote-wizard__footer">
        <p class="hot-quote-wizard__privacy">${escapeHtml(copy.privacy)}</p>
        <button class="hot-quote-wizard__submit" type="submit"></button>
      </footer>
    </form>
  </div>`;
}

function ensureDialog(): HTMLDialogElement {
  if (dialog?.isConnected) return dialog;
  const next = document.createElement('dialog');
  next.className = 'hot-quote-wizard';
  next.id = 'hot-quote-wizard';
  next.setAttribute('aria-labelledby', 'hot-quote-wizard-title');
  document.body.append(next);
  dialog = next;
  return next;
}

function field(form: HTMLFormElement, name: string): HTMLInputElement | HTMLSelectElement {
  const element = form.elements.namedItem(name);
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing field ${name}.`);
  }
  return element;
}

function syncCustomerType(form: HTMLFormElement): void {
  const type = (form.elements.namedItem('customerType') as RadioNodeList | null)?.value === 'private' ? 'private' : 'company';
  form.querySelectorAll<HTMLElement>('.hot-quote-wizard__company').forEach((element) => {
    element.hidden = type === 'private';
  });
  for (const name of ['companyName', 'vatNumber']) {
    const input = field(form, name) as HTMLInputElement;
    input.required = type === 'company';
  }
}

function statusElement(): HTMLElement {
  const element = document.getElementById('hot-quote-wizard-status');
  if (!element) throw new Error('Quote wizard status element missing.');
  return element;
}

function setStatus(message: string, state: 'idle' | 'error' | 'success' = 'idle'): void {
  const element = statusElement();
  element.textContent = message;
  element.dataset.state = state;
}

function customerFromForm(form: HTMLFormElement, locale: QuoteLocale): QuoteCustomerInput {
  const copy = COPY[locale];
  const customerType = (form.elements.namedItem('customerType') as RadioNodeList | null)?.value === 'private' ? 'private' : 'company';
  const companyName = field(form, 'companyName').value.trim();
  const vatNumber = field(form, 'vatNumber').value.trim().toUpperCase();
  if (customerType === 'company' && !companyName) throw new Error(copy.requiredCompany);
  if (customerType === 'company' && !vatNumber) throw new Error(copy.requiredVat);

  let phone: string;
  let email: string;
  try {
    phone = normalizePhone(field(form, 'phone').value);
  } catch {
    throw new Error(copy.invalidPhone);
  }
  try {
    email = normalizeEmail(field(form, 'email').value);
  } catch {
    throw new Error(copy.invalidEmail);
  }

  const optionalAddress = field(form, 'addressLine2').value.trim();
  return {
    type: customerType,
    ...(customerType === 'company' ? { companyName, vatNumber } : {}),
    firstName: field(form, 'firstName').value.trim(),
    lastName: field(form, 'lastName').value.trim(),
    countryCode: field(form, 'countryCode').value.trim().toUpperCase(),
    email,
    phone,
    street: field(form, 'street').value.trim(),
    streetNumber: field(form, 'streetNumber').value.trim(),
    postalCode: field(form, 'postalCode').value.trim(),
    city: field(form, 'city').value.trim(),
    ...(optionalAddress ? { addressLine2: optionalAddress } : {}),
  };
}

function openSelectedChannel(channel: QuoteChannel, locale: QuoteLocale, customer: QuoteCustomerInput, quote: Awaited<ReturnType<typeof submitQuote>>['quote'], popup: Window | null): void {
  const message = buildChannelMessage(locale, customer, quote);
  if (channel === 'whatsapp') {
    const url = `https://wa.me/${HOT_WHATSAPP}?text=${encodeURIComponent(message)}`;
    if (popup && !popup.closed) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.location.href = url;
    }
    return;
  }

  popup?.close();
  const subject = `House of Tartufo · ${quote.quoteId}`;
  window.location.href = `mailto:${HOT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

function configureDialog(channel: QuoteChannel): void {
  selectedChannel = channel;
  const locale = currentQuoteLocale();
  const copy = COPY[locale];
  const active = ensureDialog();
  active.innerHTML = template(locale);
  const form = active.querySelector<HTMLFormElement>('#hot-quote-wizard-form');
  const submitButton = active.querySelector<HTMLButtonElement>('.hot-quote-wizard__submit');
  if (!form || !submitButton) throw new Error('Quote wizard could not initialise.');
  submitButton.textContent = channel === 'whatsapp' ? copy.submitWhatsApp : copy.submitEmail;

  active.querySelector<HTMLButtonElement>('[data-hot-quote-close]')?.addEventListener('click', () => active.close());
  active.addEventListener('click', (event) => {
    if (event.target === active) active.close();
  }, { once: true });
  form.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.name === 'customerType') syncCustomerType(form);
  });
  syncCustomerType(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const lines = readQuoteLines();
    if (!lines.length) {
      setStatus(copy.noProducts, 'error');
      return;
    }
    const config = quoteEngineConfig();
    if (!config.apiBase) {
      setStatus(copy.apiMissing, 'error');
      return;
    }

    let customer: QuoteCustomerInput;
    try {
      customer = customerFromForm(form, locale);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.failed, 'error');
      return;
    }

    const popup = selectedChannel === 'whatsapp' ? window.open('about:blank', '_blank') : null;
    submitButton.disabled = true;
    setStatus(copy.sending);
    try {
      const idempotencyKey = idempotencyKeyFor(lines, selectedChannel);
      const result = await submitQuote(config.apiBase, {
        idempotencyKey,
        locale,
        preferredChannel: selectedChannel,
        customer,
        lines,
      });
      setStatus(`${copy.accepted} ${result.quote.quoteId}`, 'success');
      window.dispatchEvent(new CustomEvent('hot:quote-engine-accepted', {
        detail: { quoteId: result.quote.quoteId, channel: selectedChannel, duplicate: result.duplicate },
      }));
      active.close();
      openSelectedChannel(selectedChannel, locale, customer, result.quote, popup);
    } catch (error) {
      popup?.close();
      setStatus(error instanceof Error && error.message ? error.message : copy.failed, 'error');
      window.dispatchEvent(new CustomEvent('hot:quote-engine-failed', {
        detail: { channel: selectedChannel },
      }));
    } finally {
      submitButton.disabled = false;
    }
  });

  active.showModal();
  window.setTimeout(() => field(form, 'companyName').focus(), 0);
}

function bind(): void {
  const config = quoteEngineConfig();
  if (!config.enabled) return;

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const whatsapp = target.closest('#whatsapp-order');
    const email = target.closest('#email-order');
    if (!whatsapp && !email) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    configureDialog(whatsapp ? 'whatsapp' : 'email');
  }, { capture: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}

export {};
