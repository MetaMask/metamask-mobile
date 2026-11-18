import { validate, type Struct } from '@metamask/superstruct';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';

// Private PackPartner response validation and transport helpers.
// One HTTP attempt per invocation, with no response cache or automatic retry.
// DataService owns read policy; Provider owns operation polling/reconciliation.
/** Raw result of an HTTP call: status and parsed JSON body (null if none). */
export interface PackPartnerHttpResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface PackPartnerRequestJsonParams {
  fetch: typeof fetch;
  url: string;
  timeoutMs: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** Serialized as JSON when set. */
  body?: unknown;
  /** Cancellation supplied by a read owner; never used for transaction writes. */
  signal?: AbortSignal;
}

/** A caller cancellation is distinct from our retryable request timeout. */
export const throwIfReadAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    // Do not propagate signal.reason: it may contain arbitrary caller data.
    throw Object.assign(new Error('Read cancelled'), { name: 'AbortError' });
  }
};

/** Global fetch, resolved at call time so test spies and polyfills apply. */
export const defaultFetch: typeof fetch = (...args: Parameters<typeof fetch>) =>
  globalThis.fetch(...args);

/** Parses a JSON text, `null` when empty or not JSON. */
const parseJson = (text: string): unknown => {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Sends a JSON request with an abort timeout. Never throws on HTTP statuses;
 * throws a retryable NETWORK_ERROR on network failure or timeout.
 * The retryable flag describes the error; it never resends a request here.
 */
export const requestJson = async ({
  fetch: fetchFn,
  url,
  timeoutMs,
  method = 'GET',
  headers = {},
  body,
  signal,
}: PackPartnerRequestJsonParams): Promise<PackPartnerHttpResult> => {
  throwIfReadAborted(signal);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    throwIfReadAborted(signal);
    return { ok: response.ok, status: response.status, body: parseJson(text) };
  } catch {
    throwIfReadAborted(signal);
    throw createPackPartnerError({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
};

/** Validates (and coerces) a payload, throws INVALID_RESPONSE on mismatch. */
export const parseResponse = <T, S>(
  struct: Struct<T, S>,
  value: unknown,
  context: string,
): T => {
  const [error, result] = validate(value, struct, { coerce: true });
  if (error) {
    throw createPackPartnerError({
      code: 'INVALID_RESPONSE',
      context,
    });
  }
  return result;
};

/** Keeps only the items matching the struct (coerced), dropping the others. */
export const parseItems = <T, S>(
  struct: Struct<T, S>,
  items: readonly unknown[],
): T[] =>
  items.flatMap((item) => {
    const [error, result] = validate(item, struct, { coerce: true });
    return error ? [] : [result];
  });

/** Builds a query string, skipping undefined values. */
export const toQueryString = (
  params: Record<string, string | number | boolean | undefined>,
): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] =>
      entry[1] !== undefined,
  );
  return entries.length
    ? `?${entries
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
        )
        .join('&')}`
    : '';
};
