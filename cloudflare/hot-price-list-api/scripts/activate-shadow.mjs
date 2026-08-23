import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY_CONFIG = '.wrangler.deploy.json';

function required(name) {
  if (!process.env[name]?.trim()) throw new Error(`Refusing shadow activation: ${name} is missing.`);
}

if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Refusing shadow activation outside an explicit workflow_dispatch run.');
if (process.env.QUOTE_ENGINE_SHADOW_ENABLED !== 'true') throw new Error('Refusing shadow activation without QUOTE_ENGINE_SHADOW_ENABLED=true.');

for (const name of ['TURNSTILE_SECRET','BILLIT_API_KEY','BILLIT_PARTY_ID','ATTIO_API_KEY','ADMIN_NOTIFICATION_WEBHOOK']) required(name);

const hasShopifyToken = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
const hasShopifyClientCredentials = Boolean(process.env.SHOPIFY_CLIENT_ID?.trim() && process.env.SHOPIFY_CLIENT_SECRET?.trim());
if (!hasShopifyToken && !hasShopifyClientCredentials) throw new Error('Refusing shadow activation: Shopify credentials are missing.');

const config = JSON.parse(readFileSync(DEPLOY_CONFIG, 'utf8'));
if (config.workers_dev !== false) throw new Error('Refusing shadow activation: the primary workers.dev route must remain disabled.');
if (config.preview_urls !== true) throw new Error('Refusing shadow activation: version preview URLs must be explicitly enabled.');
if (config.route || (Array.isArray(config.routes) && config.routes.length)) throw new Error('Refusing shadow activation: production/custom routes are not allowed during shadow QA.');
if (Array.isArray(config.queues?.consumers) && config.queues.consumers.length) throw new Error('Refusing shadow activation: the base deploy config must not already contain queue consumers.');
if (Array.isArray(config.triggers?.crons) && config.triggers.crons.length) throw new Error('Refusing shadow activation: cron triggers are not allowed during shadow QA.');
if (!config.vars?.TURNSTILE_HOSTNAMES || !config.vars?.API_ORIGIN) throw new Error('Refusing shadow activation: controlled hostname/origin allowlists are missing.');
if (!config.vars?.SHOPIFY_SHOP_DOMAIN?.endsWith('.myshopify.com')) throw new Error('Refusing shadow activation: verified Shopify Admin domain is missing.');

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
