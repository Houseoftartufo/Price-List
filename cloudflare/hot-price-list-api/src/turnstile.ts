import type { Env } from './env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const QUOTE_ACTION = 'quote_request';

interface TurnstileResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export class TurnstileVerificationError extends Error {
  constructor(
    public readonly code: 'turnstile-not-configured' | 'turnstile-required' | 'turnstile-unavailable' | 'turnstile-rejected',
    public readonly status: 403 | 503,
    message: string,
  ) {
    super(message);
    this.name = 'TurnstileVerificationError';
  }
}

function configuredHostnames(env: Env): Set<string> {
  return new Set((env.TURNSTILE_HOSTNAMES || '')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean));
}

export function turnstileConfigured(env: Env): boolean {
  return Boolean(env.TURNSTILE_SECRET?.trim() && configuredHostnames(env).size);
}

export async function verifyTurnstile(request: Request, env: Env, token?: string): Promise<void> {
  const secret = env.TURNSTILE_SECRET?.trim();
  const hostnames = configuredHostnames(env);
  if (!secret || !hostnames.size) {
    throw new TurnstileVerificationError(
      'turnstile-not-configured',
      503,
      'Quotation security verification is not configured.',
    );
  }

  const cleanToken = token?.trim();
  if (!cleanToken || cleanToken.length > 2048) {
    throw new TurnstileVerificationError(
      'turnstile-required',
      403,
      'Please complete the security verification before submitting the quotation.',
    );
  }

  const body = new URLSearchParams({
    secret,
    response: cleanToken,
    idempotency_key: crypto.randomUUID(),
  });
  const remoteIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (remoteIp) body.set('remoteip', remoteIp);

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new TurnstileVerificationError(
      'turnstile-unavailable',
      503,
      'Quotation security verification is temporarily unavailable.',
    );
  }

  if (!response.ok) {
    throw new TurnstileVerificationError(
      'turnstile-unavailable',
      503,
      'Quotation security verification is temporarily unavailable.',
    );
  }

  let result: TurnstileResult;
  try {
    result = await response.json() as TurnstileResult;
  } catch {
    throw new TurnstileVerificationError(
      'turnstile-unavailable',
      503,
      'Quotation security verification is temporarily unavailable.',
    );
  }

  const hostname = result.hostname?.trim().toLowerCase();
  if (!result.success || result.action !== QUOTE_ACTION || !hostname || !hostnames.has(hostname)) {
    throw new TurnstileVerificationError(
      'turnstile-rejected',
      403,
      'Security verification failed. Please retry the quotation request.',
    );
  }
}
