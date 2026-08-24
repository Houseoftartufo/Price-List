import { readFileSync } from 'node:fs';

const CONFIG = process.argv[2] || 'wrangler.jsonc';
const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const errors = [];

if (config.workers_dev !== false) errors.push('workers_dev must be false in the base shadow config');
if (config.preview_urls !== true) errors.push('preview_urls must be explicitly true for version-only shadow QA');
if (config.route || (Array.isArray(config.routes) && config.routes.length > 0)) errors.push('custom routes must not exist in the base shadow config');
if (config.vars?.QUOTE_ENGINE_ENABLED !== 'false') errors.push('QUOTE_ENGINE_ENABLED must be false in the base shadow config');
if (Array.isArray(config.queues?.consumers) && config.queues.consumers.length > 0) errors.push('queue consumers must not exist in the base shadow config');
if (Array.isArray(config.triggers?.crons) && config.triggers.crons.length > 0) errors.push('cron triggers must not exist in the base shadow config');

const producer = config.queues?.producers?.find((entry) => entry?.binding === 'QUOTE_JOBS' && entry?.queue === 'hot-price-list-jobs');
if (!producer) errors.push('QUOTE_JOBS producer binding must target hot-price-list-jobs');

if (errors.length > 0) {
  console.error('[shadow-safety] FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[shadow-safety] PASS · base config is OFF, version-preview-only and trigger-free');
