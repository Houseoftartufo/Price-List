import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const chunks = [
  'brand-src/dark.01.b64',
  'brand-src/dark.02.b64',
  'brand-src/dark.03.b64',
  'brand-src/dark.04.b64',
];

function officialLogoBytes(): Buffer {
  const encoded = chunks.map((path) => readFileSync(resolve(root, path), 'utf8').trim()).join('');
  return Buffer.from(encoded, 'base64');
}

describe('official House of Tartufo logo master', () => {
  it('reconstructs the exact approved transparent PNG', () => {
    const bytes = officialLogoBytes();
    expect(bytes.length).toBe(19_562);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '987b6b3dda3d5dc6950947050b277cba04ff264bb5abdb44858ba0369b2185b7',
    );
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // PNG IHDR: 927 × 250, color type 6 = RGBA (truecolour + alpha).
    expect(bytes.readUInt32BE(16)).toBe(927);
    expect(bytes.readUInt32BE(20)).toBe(250);
    expect(bytes[25]).toBe(6);
  });
});
