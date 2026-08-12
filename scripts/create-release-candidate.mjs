import { cp, mkdir, readFile } from 'node:fs/promises';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://houseoftartufo-price-list.vercel.app/';
const dist = new URL('../dist/', import.meta.url);
const output = new URL('../release-candidate/', import.meta.url);

await mkdir(output, { recursive: true });
await cp(dist, output, { recursive: true, force: true });

const [productionHtml, previewHtml] = await Promise.all([
  readFile(new URL('index.html', output), 'utf8'),
  readFile(new URL('preview.html', output), 'utf8'),
]);

if (productionHtml.includes('noindex,nofollow')) {
  throw new Error('Release candidate production homepage still contains preview robots metadata.');
}
if (!productionHtml.includes('index,follow')) {
  throw new Error('Release candidate production homepage is missing index,follow metadata.');
}
if (!productionHtml.includes(`rel="canonical" href="${PRODUCTION_URL}"`)) {
  throw new Error(`Release candidate canonical URL is missing or does not match ${PRODUCTION_URL}.`);
}
if (!productionHtml.includes(`property="og:url" content="${PRODUCTION_URL}"`)) {
  throw new Error(`Release candidate Open Graph URL is missing or does not match ${PRODUCTION_URL}.`);
}
if (!previewHtml.includes('noindex,nofollow')) {
  throw new Error('Protected preview must remain noindex,nofollow.');
}

console.log(`[release-candidate] PASS · verified production homepage staged for ${PRODUCTION_URL}`);
