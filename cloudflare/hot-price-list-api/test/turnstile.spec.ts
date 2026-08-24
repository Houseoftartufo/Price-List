import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { verifyTurnstile } from '../src/turnstile';

function env(overrides: Partial<Env> = {}): Env {
  return {
    TURNSTILE_SECRET: 'test-secret',
    TURNSTILE_HOSTNAMES: 'pricelist.houseoftartufo.com',
    ...overrides,
  } as Env;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('accepts only a successful quote_request challenge from an allowed hostname', async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init) calls.push(init);
      return Response.json({
        success: true,
        action: 'quote_request',
        hostname: 'pricelist.houseoftartufo.com',
      });
    });

    await expect(verifyTurnstile(
      new Request('https://api.example.test/quotes', {
        headers: { 'CF-Connecting-IP': '203.0.113.10' },
      }),
      env(),
      'valid-turnstile-token',
    )).resolves.toBeUndefined();

    expect(calls).toHaveLength(1);
    const body = calls[0]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).get('response')).toBe('valid-turnstile-token');
    expect((body as URLSearchParams).get('remoteip')).toBe('203.0.113.10');
  });

  it('rejects a valid-looking token issued for a different hostname', async () => {
    vi.stubGlobal('fetch', async () => Response.json({
      success: true,
      action: 'quote_request',
      hostname: 'attacker.example',
    }));

    await expect(verifyTurnstile(
      new Request('https://api.example.test/quotes'),
      env(),
      'wrong-host-token',
    )).rejects.toMatchObject({ code: 'turnstile-rejected', status: 403 });
  });

  it('rejects a token issued for another Turnstile action', async () => {
    vi.stubGlobal('fetch', async () => Response.json({
      success: true,
      action: 'login',
      hostname: 'pricelist.houseoftartufo.com',
    }));

    await expect(verifyTurnstile(
      new Request('https://api.example.test/quotes'),
      env(),
      'wrong-action-token',
    )).rejects.toMatchObject({ code: 'turnstile-rejected', status: 403 });
  });
});
