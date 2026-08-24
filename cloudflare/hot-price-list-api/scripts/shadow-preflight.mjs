const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function versionRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.versions)) return payload.versions;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.result?.items)) return payload.result.items;
  return [];
}

export function extractLatestVersionId(payload) {
  const first = versionRows(payload)[0];
  const value = first?.id || first?.version_id || first?.versionId;
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new Error('Refusing shadow activation: latest Worker Version ID is missing or invalid.');
  }
  return value;
}

export function versionPreviewUrl(versionId, workerName, subdomain) {
  if (!UUID.test(versionId)) throw new Error('Invalid Worker Version ID.');
  if (!/^[a-z0-9_][a-z0-9-_]*$/.test(workerName)) throw new Error('Invalid Worker name.');
  if (!/^[a-z0-9-]+$/.test(subdomain)) throw new Error('Invalid workers.dev subdomain.');
  return `https://${versionId.slice(0, 8)}-${workerName}.${subdomain}.workers.dev`;
}

export function assertSyncResult(payload) {
  if (!payload || payload.ok !== true) throw new Error('Refusing shadow activation: Billit catalogue sync failed.');
  const total = Number(payload.total);
  const ready = Number(payload.ready);
  const warning = Number(payload.warning);
  const blocked = Number(payload.blocked);
  if (!Number.isInteger(total) || total <= 0) throw new Error('Refusing shadow activation: Billit catalogue sync is empty.');
  if (![ready, warning, blocked].every(Number.isInteger) || ready < 0 || warning < 0 || blocked < 0 || ready + warning + blocked !== total) {
    throw new Error('Refusing shadow activation: Billit catalogue sync counts are invalid.');
  }
  if (ready + warning <= 0) throw new Error('Refusing shadow activation: Billit sync produced no buyer-visible products.');
  return payload;
}

export function assertPublicCatalogue(payload) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.products)) {
    throw new Error('Refusing shadow activation: public Billit catalogue payload is invalid.');
  }
  if (payload.products.length === 0) throw new Error('Refusing shadow activation: public Billit catalogue is empty.');
  for (const product of payload.products) {
    if (!product || typeof product.sku !== 'string' || !product.sku.trim()) {
      throw new Error('Refusing shadow activation: public catalogue contains an invalid SKU.');
    }
    if (product.health === 'BLOCKED' || !Number.isFinite(Number(product.basePriceExVat)) || Number(product.basePriceExVat) <= 0) {
      throw new Error(`Refusing shadow activation: SKU ${product.sku} has an invalid fiscal price.`);
    }
  }
  return payload;
}
