import type { QuoteLocale } from './quote-engine-client';

const TURNSTILE_SCRIPT_ID = 'hot-turnstile-api';
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_ACTION = 'quote_request';

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: 'interaction-only';
  language: QuoteLocale;
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
  'error-callback': (code: string) => boolean;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove?(widgetId: string): void;
}

type TurnstileWindow = Window & typeof globalThis & { turnstile?: TurnstileApi };

export interface TurnstileController {
  token(): string | undefined;
  reset(): void;
  destroy(): void;
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function turnstileWindow(): TurnstileWindow {
  return window as TurnstileWindow;
}

function loadTurnstile(): Promise<TurnstileApi> {
  const existingApi = turnstileWindow().turnstile;
  if (existingApi) return Promise.resolve(existingApi);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const finish = (): void => {
      const api = turnstileWindow().turnstile;
      if (api) resolve(api);
      else reject(new Error('Turnstile API did not initialise.'));
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Turnstile API failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Turnstile API failed to load.')), { once: true });
    document.head.append(script);
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

export async function mountTurnstile(
  container: HTMLElement,
  sitekey: string,
  locale: QuoteLocale,
  onRuntimeError?: () => void,
): Promise<TurnstileController> {
  const api = await loadTurnstile();
  let currentToken: string | undefined;
  let widgetId = '';

  widgetId = api.render(container, {
    sitekey,
    action: TURNSTILE_ACTION,
    appearance: 'interaction-only',
    language: locale,
    size: 'flexible',
    callback: (token) => {
      currentToken = token;
    },
    'expired-callback': () => {
      currentToken = undefined;
    },
    'timeout-callback': () => {
      currentToken = undefined;
      onRuntimeError?.();
    },
    'error-callback': () => {
      currentToken = undefined;
      onRuntimeError?.();
      if (widgetId) window.setTimeout(() => api.reset(widgetId), 3000);
      return true;
    },
  });

  if (!widgetId) throw new Error('Turnstile widget could not be rendered.');

  return {
    token: () => currentToken,
    reset: () => {
      currentToken = undefined;
      api.reset(widgetId);
    },
    destroy: () => {
      currentToken = undefined;
      api.remove?.(widgetId);
    },
  };
}
