export interface Env {
  DB: D1Database;
  QUOTE_JOBS: Queue;
  BILLIT_API_KEY: string;
  BILLIT_PARTY_ID: string;
  SHOPIFY_SHOP_DOMAIN: string;
  SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_SHADOW_PROXY_URL?: string;
  ATTIO_API_KEY: string;
  ATTIO_DEAL_OWNER_EMAIL?: string;
  ADMIN_NOTIFICATION_WEBHOOK?: string;
  API_ORIGIN?: string;
  QUOTE_ENGINE_ENABLED?: string;
  BILLIT_BASE_URL?: string;
  SHOPIFY_API_VERSION?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
}

export function quoteEngineEnabled(env: Env): boolean {
  return env.QUOTE_ENGINE_ENABLED === 'true';
}

export function billitBaseUrl(env: Env): string {
  return (env.BILLIT_BASE_URL || 'https://api.billit.be').replace(/\/$/, '');
}

export function shopifyApiVersion(env: Env): string {
  return env.SHOPIFY_API_VERSION || '2026-07';
}
