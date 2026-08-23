import { readFile, writeFile } from 'node:fs/promises';

const snapshotUrl = new URL('../public/data/translations.snapshot.json', import.meta.url);
const raw = await readFile(snapshotUrl, 'utf8');
const bundle = JSON.parse(raw);

if (!bundle?.en || typeof bundle.en !== 'object') {
  throw new Error('English translation dictionary is missing.');
}

bundle.de = {
  ...bundle.en,
  ...(bundle.de && typeof bundle.de === 'object' ? bundle.de : {}),
};

if (typeof bundle.de['cover.sub1'] === 'string') {
  bundle.de['cover.sub1'] = bundle.de['cover.sub1']
    .replace(/Products?/g, 'Produkte')
    .replace(/Categories?/g, 'Kategorien');
}

await writeFile(snapshotUrl, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
console.log(`DE translation dictionary ready: ${Object.keys(bundle.de).length} keys.`);
