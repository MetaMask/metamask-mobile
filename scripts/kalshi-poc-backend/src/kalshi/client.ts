import { URL } from 'node:url';
import { config } from '../config.ts';
import { signRequest } from './signing.ts';
import { normalizeError, type KalshiNormalizedError } from './errors.ts';

export class KalshiHttpError extends Error {
  status: number;
  body: KalshiNormalizedError;
  constructor(body: KalshiNormalizedError) {
    super(`Kalshi ${body.status} ${body.code}: ${body.message}`);
    this.status = body.status;
    this.body = body;
  }
}

export interface KalshiCredential {
  apiKeyId: string;
  pem: string;
}

export const adminCredential: KalshiCredential = {
  apiKeyId: config.kalshi.adminApiKeyId,
  pem: config.kalshi.adminPem,
};

/**
 * Signed Kalshi HTTP client. `path` must include the leading slash and the
 * Kalshi `/trade-api/v2/...` prefix (the signed pre-image is method + path
 * with no host and no query string).
 */
export async function kalshiFetch<T = unknown>(params: {
  credential: KalshiCredential;
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}): Promise<T> {
  const headers = signRequest({
    apiKeyId: params.credential.apiKeyId,
    pem: params.credential.pem,
    method: params.method,
    path: params.path,
  });

  const url = new URL(config.kalshi.baseUrl + params.path);
  if (params.query) {
    for (const [k, v] of Object.entries(params.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: params.method,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : undefined;

  if (config.kalshi.debug) {
    // eslint-disable-next-line no-console
    console.log(
      `[kalshi] ${params.method} ${params.path} -> ${res.status}`,
      parsed === undefined ? text : parsed,
    );
  }

  if (!res.ok) {
    throw new KalshiHttpError(normalizeError(res.status, parsed ?? text));
  }
  return (parsed ?? {}) as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
