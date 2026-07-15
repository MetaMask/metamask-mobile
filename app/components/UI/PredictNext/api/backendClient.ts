import { DEFAULT_BACKEND_BASE_URL } from '../constants/venueConfig';
import { PredictError, PredictErrorCode } from '../types/errors';

/**
 * Tiny fetch wrapper for the throwaway Kalshi POC backend. All routes share a
 * canonical `{ error: { code, message } }` envelope; non-2xx responses are
 * rethrown as `PredictError`.
 */

interface BackendErrorEnvelope {
  error: {
    code: string;
    message?: string;
    venueDetails?: unknown;
  };
}

function isBackendErrorEnvelope(value: unknown): value is BackendErrorEnvelope {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'error' in value &&
      (value as { error: unknown }).error &&
      typeof (value as { error: unknown }).error === 'object',
  );
}

function mapErrorCode(code: string): PredictErrorCode {
  return code in PredictErrorCode
    ? (PredictErrorCode as Record<string, PredictErrorCode>)[code]
    : PredictErrorCode.UNKNOWN_ERROR;
}

export interface BackendClientOptions {
  baseUrl?: string;
  externalUserId?: string;
}

export class BackendClient {
  private baseUrl: string;
  private externalUserId?: string;

  constructor(opts: BackendClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BACKEND_BASE_URL).replace(/\/$/, '');
    this.externalUserId = opts.externalUserId;
  }

  setExternalUserId(externalUserId: string): void {
    this.externalUserId = externalUserId;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async get<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (this.externalUserId) {
      url.searchParams.set('externalUserId', this.externalUserId);
    }
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, v);
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(this.baseUrl + path);
    const payload = this.externalUserId
      ? { externalUserId: this.externalUserId, ...(body as Record<string, unknown> | undefined) }
      : body;
    return this.request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url.toString(), init);
    } catch (cause) {
      throw new PredictError(
        PredictErrorCode.NETWORK_ERROR,
        `Failed to reach Kalshi POC backend at ${url.origin}`,
        cause,
      );
    }
    const text = await response.text();
    const parsed = text ? safeJson(text) : undefined;
    if (!response.ok) {
      if (isBackendErrorEnvelope(parsed)) {
        throw new PredictError(
          mapErrorCode(parsed.error.code),
          parsed.error.message ?? parsed.error.code,
          parsed.error.venueDetails,
        );
      }
      throw new PredictError(
        PredictErrorCode.UNKNOWN_ERROR,
        `Backend ${response.status}`,
        text,
      );
    }
    return (parsed ?? ({} as T)) as T;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
