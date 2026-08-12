import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://houseoftartufo-price-list.vercel.app/';
const dist = new URL('../dist/', import.meta.url);
const output = new URL('../release-candidate/', import.meta.url);

await mkdir(output, { recursive: true });
await cp(dist, output, { recursive: true, force: true });

let html = await readFile(new URL('preview.html', dist), 'utf8');
html = html
  .replace('noindex,nofollow', 'index,follow')
  .replace('House of Tartufo — Wholesale Catalogue 10x Preview', 'House of Tartufo — Wholesale Catalogue')
  .replace(
    '<meta property="og:type" content="website" />',
    `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${PRODUCTION_URL}" />\n    <link rel="canonical" href="${PRODUCTION_URL}" />`,
  );

if (html.includes('noindex,nofollow')) throw new Error('Release candidate still contains preview robots metadata.');
if (!html.includes('rel="canonical"')) throw new Error('Release candidate canonical URL is missing.');
if (!html.includes('property="og:url"')) throw new Error('Release candidate Open Graph URL is missing.');

await writeFile(new URL('index.html', output), html, 'utf8');
console.log(`[release-candidate] PASS · production candidate generated for ${PRODUCTION_URL}`);
