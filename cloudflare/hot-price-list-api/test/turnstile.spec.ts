import { describe, expect, it } from 'vitest';
import type { Env } from '../src/env';
import { verifyTurnstile } from '../src/turnstile';

function env(overrides: Partial<Env> = {}): Env {
  return {
    TURNSTILE_SECRET: 'test-secret',
    TURNSTILE_HOSTNAMES: 'pricelist.houseoftartufo.com',
    ...overrides,
  } as Env;
}

describe('Turnstile quote protection', () => {
  it('fails closed when the secret or hostname allowlist is missing', async () => {
    const missingSecret = env();
    delete missingSecret.TURNSTILE_SECRET;

    await expect(verifyTurnstile(
      new Request('https://api.example.test/quotes'),
      missingSecret,
      'token',
    )).rejects.toMatchObject({ code: 'turnstile-not-configured', status: 503 });
  });

  it('rejects a new quote without a Turnstile token before provider work starts', async () => {
    await expect(verifyTurnstile(
      new Request('https://api.example.test/quotes'),
      env(),
      undefined,
    )).rejects.toMatchObject({ code: 'turnstile-required', status: 403 });
  });
});
