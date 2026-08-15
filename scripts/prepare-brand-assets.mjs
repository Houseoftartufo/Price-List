import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const output = resolve(ROOT, 'public/brand/house-of-tartufo-logo-dark.png');
const chunks = [
  'brand-src/dark.01.b64',
  'brand-src/dark.02.b64',
  'brand-src/dark.03.b64',
  'brand-src/dark.04.b64',
];

const EXPECTED_BYTES = 19_562;
const EXPECTED_SHA256 = '987b6b3dda3d5dc6950947050b277cba04ff264bb5abdb44858ba0369b2185b7';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const source = chunks
  .map((path) => readFileSync(resolve(ROOT, path), 'utf8').trim())
  .join('');
const bytes = Buffer.from(source, 'base64');
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== EXPECTED_BYTES) {
  throw new Error(`Official logo byte-length mismatch: expected ${EXPECTED_BYTES}, received ${bytes.length}.`);
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Official logo checksum mismatch: expected ${EXPECTED_SHA256}, received ${sha256}.`);
}
if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
  throw new Error('Official logo source is not a valid PNG stream.');
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);
console.log(`[brand] official transparent logo ready: ${bytes.length} bytes · ${sha256}`);
