import { startSpan } from '@sentry/core';
import { assert, type Struct } from '@metamask/superstruct';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import {
  HttpError,
  NetworkError,
  OfflineError,
  ParseError,
  TimeoutError,
  parseRetryAfter,
} from './errors';
import { isTierPolicyEnabled } from './killSwitch';
import { resolveTimeout } from './policies';

export interface RequestOptions {
  /** Pass TanStack's `signal` so a cancelled query cancels the request. */
  signal?: AbortSignal;
  /** Defaults to the hardware tier timeout. */
  timeoutMs?: number;
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  /** JSON-encoded. */
  body?: unknown;
  headers?: HeadersInit;
  /** Static feature identifier, never user or request data. */
  feature?: string;
  /** Static operation identifier, never user or request data. */
  operation?: string;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Options<Data, Schema> = RequestOptions & {
  responseStruct?: Struct<Data, Schema>;
};

function cancelled(): Error {
  const error = new Error('Network request cancelled');
  error.name = 'AbortError';
  return error;
}

function requestUrl(input: string | URL, query: RequestOptions['query']): URL {
  try {
    const url = new URL(input.toString());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new TypeError();
    }
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
  } catch {
    throw new TypeError('Invalid HTTP request URL');
  }
}

async function request<Data, Schema>(
  method: Method,
  input: string | URL,
  options: Options<Data, Schema> = {},
): Promise<unknown> {
  const url = requestUrl(input, options.query);
  const conditions = getNetworkConditions();
  const enabled = isTierPolicyEnabled();
  if (enabled && conditions.network === 'NONE') throw new OfflineError();
  if (options.signal?.aborted) throw cancelled();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    options.timeoutMs ?? resolveTimeout(conditions, enabled),
  );
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel);
  // Settles even when fetch ignores the signal.
  const stopped = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () =>
      reject(timedOut ? new TimeoutError() : cancelled()),
    );
  });
  try {
    return await startSpan(
      {
        name: method,
        op: 'http.request',
        attributes: { feature: options.feature, operation: options.operation },
      },
      () => Promise.race([stopped, send(method, url, options, controller)]),
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

async function send<Data, Schema>(
  method: Method,
  url: URL,
  options: Options<Data, Schema>,
  { signal }: AbortController,
): Promise<unknown> {
  const headers = new Headers(options.headers);
  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/json');
  }
  // shortcut: no credentials, add a bearer option when a feature hook needs one.
  if (headers.has('authorization')) {
    throw new TypeError('httpClient does not send credentials');
  }

  let response: Response;
  try {
    response = await global.fetch(url.toString(), {
      method,
      headers,
      body,
      signal,
    });
  } catch {
    throw new NetworkError();
  }
  if (!response.ok) {
    throw new HttpError(
      response.status,
      url.hostname,
      parseRetryAfter(response.headers.get('retry-after')),
    );
  }
  try {
    const text = await response.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    if (options.responseStruct) assert(data, options.responseStruct);
    return data;
  } catch {
    throw new ParseError();
  }
}

function withMethod(method: Method) {
  function call<Data, Schema>(
    url: string | URL,
    options: RequestOptions & { responseStruct: Struct<Data, Schema> },
  ): Promise<Data>;
  function call(url: string | URL, options?: RequestOptions): Promise<unknown>;
  function call<Data, Schema>(
    url: string | URL,
    options?: Options<Data, Schema>,
  ): Promise<unknown> {
    return request(method, url, options);
  }
  return call;
}

/**
 * The app's HTTP client. One attempt over the instrumented `global.fetch`:
 * retries, caching and polling belong to TanStack Query.
 */
export const httpClient = {
  get: withMethod('GET'),
  post: withMethod('POST'),
  put: withMethod('PUT'),
  patch: withMethod('PATCH'),
  delete: withMethod('DELETE'),
};
