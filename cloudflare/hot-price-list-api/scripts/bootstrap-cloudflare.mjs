import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG = 'wrangler.jsonc';
const DEPLOY_CONFIG = '.wrangler.deploy.json';
const DB_NAME = 'hot-price-list-db';
const JOB_QUEUE = 'hot-price-list-jobs';
const DLQ = 'hot-price-list-dlq';

function run(args, { capture = true } = {}) {
  const output = execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });
  return capture ? String(output) : '';
}

function jsonPayload(text) {
  const firstArray = text.indexOf('[');
  const firstObject = text.indexOf('{');
  const start = firstArray === -1 ? firstObject : firstObject === -1 ? firstArray : Math.min(firstArray, firstObject);
  if (start === -1) throw new Error('Wrangler returned no JSON payload.');
  return JSON.parse(text.slice(start));
}

function databaseId(row) {
  return row?.uuid || row?.id || row?.database_id || row?.databaseId;
}

function listDatabases() {
  return jsonPayload(run(['d1', 'list', '--json', '--config', CONFIG]));
}

function ensureDatabase() {
  let databases = listDatabases();
  let database = databases.find((item) => item?.name === DB_NAME);
  if (!database) {
    console.log(`[bootstrap] creating D1 ${DB_NAME} in EU jurisdiction`);
    run(['d1', 'create', DB_NAME, '--jurisdiction=eu', '--config', CONFIG], { capture: false });
    databases = listDatabases();
    database = databases.find((item) => item?.name === DB_NAME);
  }

  const id = databaseId(database);
  if (!id) throw new Error(`Unable to resolve database_id for ${DB_NAME}.`);
  console.log(`[bootstrap] D1 ready: ${DB_NAME}`);
  return String(id);
}

function queueExists(name) {
  const output = run(['queues', 'list', '--config', CONFIG]);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'm').test(output);
}

function ensureQueue(name) {
  if (queueExists(name)) {
    console.log(`[bootstrap] queue ready: ${name}`);
    return;
  }
  console.log(`[bootstrap] creating queue ${name}`);
  run(['queues', 'create', name, '--config', CONFIG], { capture: false });
}

function createDeployConfig(id) {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const binding = config.d1_databases?.find((item) => item.binding === 'DB' || item.database_name === DB_NAME);
  if (!binding) throw new Error('D1 binding DB is missing from Wrangler config.');
  binding.database_id = id;
  config.vars ||= {};
  config.vars.QUOTE_ENGINE_ENABLED = 'false';
  writeFileSync(DEPLOY_CONFIG, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return DEPLOY_CONFIG;
}

const id = ensureDatabase();
ensureQueue(DLQ);
ensureQueue(JOB_QUEUE);
const deployConfig = createDeployConfig(id);

console.log('[bootstrap] applying D1 migrations');
run(['d1', 'migrations', 'apply', DB_NAME, '--remote', '--config', deployConfig], { capture: false });

console.log('[bootstrap] deploying Worker with quote engine disabled by config');
run(['deploy', '--config', deployConfig], { capture: false });
console.log('[bootstrap] complete');
