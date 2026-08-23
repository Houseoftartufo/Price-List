import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY_CONFIG = '.wrangler.deploy.json';

function required(name) {
  if (!process.env[name]?.trim()) throw new Error(`Refusing shadow activation: ${name} is missing.`);
}

if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
  throw new Error('Refusing shadow activation outside an explicit workflow_dispatch run.');
}
if (process.env.QUOTE_ENGINE_SHADOW_ENABLED !== 'true') {
  throw new Error('Refusing shadow activation without QUOTE_ENGINE_SHADOW_ENABLED=true.');
}

for (const name of [
  'TURNSTILE_SECRET',
  'BILLIT_API_KEY',
  'BILLIT_PARTY_ID',
  'ATTIO_API_KEY',
  'ADMIN_NOTIFICATION_WEBHOOK',
]) required(name);

const hasShopifyToken = Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
const hasShopifyClientCredentials = Boolean(
  process.env.SHOPIFY_CLIENT_ID?.trim() && process.env.SHOPIFY_CLIENT_SECRET?.trim(),
);
if (!hasShopifyToken && !hasShopifyClientCredentials) {
  throw new Error('Refusing shadow activation: Shopify credentials are missing.');
}

const config = JSON.parse(readFileSync(DEPLOY_CONFIG, 'utf8'));
if (config.workers_dev !== true) {
  throw new Error('Refusing shadow activation: Worker must remain workers.dev-only during shadow QA.');
}
if (config.route || (Array.isArray(config.routes) && config.routes.length)) {
  throw new Error('Refusing shadow activation: production/custom routes are not allowed during shadow QA.');
}
if (!config.vars?.TURNSTILE_HOSTNAMES || !config.vars?.API_ORIGIN) {
  throw new Error('Refusing shadow activation: controlled hostname/origin allowlists are missing.');
}
if (!config.vars?.SHOPIFY_SHOP_DOMAIN?.endsWith('.myshopify.com')) {
  throw new Error('Refusing shadow activation: verified Shopify Admin domain is missing.');
}

config.vars.QUOTE_ENGINE_ENABLED = 'true';
writeFileSync(DEPLOY_CONFIG, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

console.log('[shadow] prerequisites verified; enabling quotation endpoint on workers.dev shadow only');
execFileSync('npx', ['wrangler', 'deploy', '--config', DEPLOY_CONFIG], {
  stdio: 'inherit',
  env: process.env,
});
console.log('[shadow] quote engine enabled for explicit shadow QA');
