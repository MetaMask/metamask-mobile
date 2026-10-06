import { validate, type Struct } from '@metamask/superstruct';
import { getErrorMessage } from '@metamask/utils';

/** Technical failures shared by the feature's HTTP clients. */
export class HttpError extends Error {
  readonly code:
    | 'NETWORK_ERROR'
    | 'RATE_LIMITED'
    | 'INVALID_RESPONSE'
    | 'UNKNOWN';
  readonly retryable: boolean;
  readonly status?: number;
  readonly cause?: unknown;

  constructor({
    code,
    message,
    retryable = false,
    status,
    cause,
  }: {
    code: HttpError['code'];
    message: string;
    retryable?: boolean;
    status?: number;
    cause?: unknown;
  }) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.cause = cause;
  }
}

/** Whether a fetch exception represents a network failure or timeout. */
export const isFetchNetworkError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    (error instanceof TypeError &&
      /network request failed|failed to fetch|fetch failed|load failed|network ?error|timed? ?out|aborted/iu.test(
        error.message,
      )));

/** Raw result of an HTTP call: status and parsed JSON body (null if none). */
export interface HttpResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface RequestJsonParams {
  fetch: typeof fetch;
  url: string;
  timeoutMs: number;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** Serialized as JSON when set. */
  body?: unknown;
}

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
 */
export const requestJson = async ({
  fetch: fetchFn,
  url,
  timeoutMs,
  method = 'GET',
  headers = {},
  body,
}: RequestJsonParams): Promise<HttpResult> => {
  const controller = new AbortController();
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
    return { ok: response.ok, status: response.status, body: parseJson(text) };
  } catch (error) {
    throw new HttpError({
      code: 'NETWORK_ERROR',
      message: getErrorMessage(error),
      retryable: true,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
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
    throw new HttpError({
      code: 'INVALID_RESPONSE',
      message: `${context}: invalid response at "${error.path.join('.')}"`,
      cause: error,
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

/** Readable error message from a JSON error body (`error`, `details`, `message`). */
export const getErrorBodyMessage = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const { error, details, message } = body as Record<string, unknown>;
  const parts = [error ?? message, details].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  return parts.length ? parts.join(': ') : undefined;
};

/** Builds a query string, skipping undefined values. */
export const toQueryString = (
  params: Record<string, string | number | undefined>,
): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
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

/** Removes trailing slashes from a base URL. */
export const trimBaseUrl = (url: string): string => url.replace(/\/+$/u, '');
