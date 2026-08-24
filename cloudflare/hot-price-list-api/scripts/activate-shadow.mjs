import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { assertPublicCatalogue, assertSyncResult, extractLatestVersionId, versionPreviewUrl } from './shadow-preflight.mjs';

const DEPLOY_CONFIG = '.wrangler.deploy.json';

function required(name) {
  if (!process.env[name]?.trim()) throw new Error(`Refusing shadow activation: ${name} is missing.`);
}

if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Refusing shadow activation outside an explicit workflow_dispatch run.');
if (process.env.QUOTE_ENGINE_SHADOW_ENABLED !== 'true') throw new Error('Refusing shadow activation without QUOTE_ENGINE_SHADOW_ENABLED=true.');

for (const name of ['TURNSTILE_SECRET','BILLIT_API_KEY','BILLIT_PARTY_ID','ATTIO_API_KEY','ADMIN_NOTIFICATION_WEBHOOK','SYNC_SHARED_KEY']) required(name);

const hasShopifyToken = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
const hasShopifyClientCredentials = Boolean(process.env.SHOPIFY_CLIENT_ID?.trim() && process.env.SHOPIFY_CLIENT_SECRET?.trim());

const config = JSON.parse(readFileSync(DEPLOY_CONFIG, 'utf8'));
if (config.workers_dev !== false) throw new Error('Refusing shadow activation: the primary workers.dev route must remain disabled.');
if (config.preview_urls !== true) throw new Error('Refusing shadow activation: version preview URLs must be explicitly enabled.');
if (config.route || (Array.isArray(config.routes) && config.routes.length)) throw new Error('Refusing shadow activation: production/custom routes are not allowed during shadow QA.');
if (Array.isArray(config.queues?.consumers) && config.queues.consumers.length) throw new Error('Refusing shadow activation: the base deploy config must not already contain queue consumers.');
if (Array.isArray(config.triggers?.crons) && config.triggers.crons.length) throw new Error('Refusing shadow activation: cron triggers are not allowed during shadow QA.');
if (!config.vars?.TURNSTILE_HOSTNAMES || !config.vars?.API_ORIGIN) throw new Error('Refusing shadow activation: controlled hostname/origin allowlists are missing.');
if (!config.vars?.SHOPIFY_SHOP_DOMAIN?.endsWith('.myshopify.com')) throw new Error('Refusing shadow activation: verified Shopify Admin domain is missing.');
const hasShopifyShadowProxy = /^https:\/\//.test(config.vars?.SHOPIFY_SHADOW_PROXY_URL || '');
if (!hasShopifyToken && !hasShopifyClientCredentials && !hasShopifyShadowProxy) {
  throw new Error('Refusing shadow activation: Shopify enrichment credentials/proxy are missing.');
}
if (config.vars.QUOTE_ENGINE_ENABLED !== 'false') throw new Error('Refusing shadow activation: preflight Worker must start with Quote Engine OFF.');

function wranglerJson(args) {
  const text = execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  const firstArray = text.indexOf('[');
  const firstObject = text.indexOf('{');
  const start = firstArray === -1 ? firstObject : firstObject === -1 ? firstArray : Math.min(firstArray, firstObject);
  if (start === -1) throw new Error('Refusing shadow activation: Wrangler returned no JSON payload.');
  return JSON.parse(text.slice(start));
}

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => undefined);
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}.`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

const versions = wranglerJson(['versions', 'list', '--json', '--name', config.name, '--config', DEPLOY_CONFIG]);
const versionId = extractLatestVersionId(versions);
const previewBase = versionPreviewUrl(
  versionId,
  config.name,
  process.env.PRICE_LIST_WORKERS_SUBDOMAIN?.trim() || 'house-of-tartufo',
);
const health = await fetchJson(`${previewBase}/health`);
if (health?.ok !== true || health?.quoteEngineEnabled !== false || health?.quoteProtectionConfigured !== true) {
  throw new Error('Refusing shadow activation: OFF preview health/protection gate failed.');
}

console.log('[shadow] OFF preview healthy; syncing authoritative Billit catalogue before activation');
const sync = assertSyncResult(await fetchJson(`${previewBase}/internal/catalogue/sync`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SYNC_SHARED_KEY}` },
}));
const publicCatalogue = assertPublicCatalogue(await fetchJson(`${previewBase}/catalogue`));
console.log(`[shadow] Billit catalogue verified: ${sync.total} fiscal product(s), ${publicCatalogue.products.length} buyer-visible`);

config.vars.QUOTE_ENGINE_ENABLED = 'true';
config.queues ||= {};
config.queues.consumers = [{
  queue: 'hot-price-list-jobs',
  max_batch_size: 10,
  max_batch_timeout: 5,
  max_retries: 8,
  dead_letter_queue: 'hot-price-list-dlq',
  max_concurrency: 5,
  retry_delay: 30,
}];
delete config.triggers;
writeFileSync(DEPLOY_CONFIG, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

console.log('[shadow] prerequisites verified; enabling quote endpoint and queue consumer on version-preview shadow only');
execFileSync('npx', ['wrangler', 'deploy', '--config', DEPLOY_CONFIG], { stdio: 'inherit', env: process.env });
console.log('[shadow] quote engine enabled for explicit version-preview QA; primary workers.dev and custom routes remain disabled');
