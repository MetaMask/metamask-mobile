import { API_URLS } from '@metamask/core-backend';
import { startSpan } from '@sentry/core';
import { assert, type Struct } from '@metamask/superstruct';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import Logger from '../../util/Logger';
import { resolveTimeout } from './policies';
import { getBackendBearerToken } from '../backendBearerToken';
import { isBackendAuthDisabled } from '../coreBackendApiUrls';
import {
  HttpError,
  NetworkError,
  OfflineError,
  ParseError,
  TimeoutError,
  parseRetryAfter,
} from './errors';
import { isTierPolicyEnabled } from './killSwitch';

interface RequestOptions {
  signal?: AbortSignal;
  callerSignal?: AbortSignal;
  timeoutMs?: number;
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  body?: unknown;
  headers?: HeadersInit;
  auth?: 'bearer';
  /** Static feature identifier, never user or request data. */
  feature?: string;
  /** Static operation identifier, never user or request data. */
  operation?: string;
  /** One-based attempt when the caller owns retries. */
  attempt?: number;
}

type JsonOptions<Data, Schema> = RequestOptions & {
  responseType?: 'json';
  responseStruct: Struct<Data, Schema>;
};
type DefaultOptions = RequestOptions & {
  responseType?: 'json' | 'text' | 'none';
  responseStruct?: never;
};
type ClientOptions<Data, Schema> = JsonOptions<Data, Schema> | DefaultOptions;
const bearerOrigins = new Set<string>(Object.values(API_URLS));

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
  method: string,
  input: string | URL,
  options: JsonOptions<Data, Schema>,
): Promise<Data>;
async function request(
  method: string,
  input: string | URL,
  options: DefaultOptions & { responseType: 'text' },
): Promise<string>;
async function request(
  method: string,
  input: string | URL,
  options: DefaultOptions & { responseType: 'none' },
): Promise<void>;
async function request(
  method: string,
  input: string | URL,
  options?: DefaultOptions,
): Promise<unknown>;
async function request<Data, Schema>(
  method: string,
  input: string | URL,
  options: ClientOptions<Data, Schema> = {},
): Promise<unknown> {
  if (!/^(GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH)$/u.test(method)) {
    throw new TypeError('Unsupported HTTP method');
  }
  const url = requestUrl(input, options.query);
  const conditions = getNetworkConditions();
  const enabled = isTierPolicyEnabled();
  if (enabled && conditions.network === 'NONE') throw new OfflineError();
  const timeoutMs = options.timeoutMs ?? resolveTimeout(conditions, enabled);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new TypeError('Invalid request timeout');

  const controller = new AbortController();
  const signals = [options.signal, options.callerSignal];
  const cancel = () => controller.abort();
  let timedOut = false;
  const abortError = () => {
    if (timedOut) return new TimeoutError();
    const error = new Error('Network request cancelled');
    error.name = 'AbortError';
    return error;
  };
  if (signals.some((signal) => signal?.aborted)) throw abortError();
  signals.forEach((signal) => signal?.addEventListener('abort', cancel));
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError());
    controller.signal.addEventListener('abort', onAbort);
  });
  const timer = setTimeout(() => {
    timedOut = true;
    cancel();
  }, timeoutMs);
  const startedAt = __DEV__ ? performance.now() : 0;
  let outcome: string = 'success';
  try {
    return await startSpan(
      {
        name: method,
        op: 'http.request',
        attributes: { feature: options.feature, operation: options.operation },
      },
      async () =>
        Promise.race([stopped, send(method, url, options, controller.signal)]),
    );
  } catch (error) {
    if (__DEV__) {
      outcome =
        error instanceof HttpError
          ? `HTTP ${error.status}`
          : timedOut
            ? 'timeout'
            : controller.signal.aborted
              ? 'cancelled'
              : 'error';
    }
    throw error;
  } finally {
    if (__DEV__) {
      Logger.log('[networking]', {
        feature: options.feature ?? 'unknown',
        operation: options.operation ?? 'unknown',
        ...conditions,
        tierPoliciesEnabled: enabled,
        attempt: options.attempt ?? 1,
        durationMs: Math.round(performance.now() - startedAt),
        outcome,
      });
    }
    clearTimeout(timer);
    if (onAbort) controller.signal.removeEventListener('abort', onAbort);
    signals.forEach((signal) => signal?.removeEventListener('abort', cancel));
  }
}

async function send<Data, Schema>(
  method: string,
  url: URL,
  options: ClientOptions<Data, Schema>,
  signal: AbortSignal,
): Promise<unknown> {
  let headers: Headers;
  let body: string | undefined;
  try {
    headers = new Headers(options.headers);
    if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      if (!headers.has('content-type'))
        headers.set('content-type', 'application/json');
    }
  } catch {
    throw new TypeError('Invalid HTTP request options');
  }
  if (headers.has('authorization')) {
    throw new TypeError('Authorization must use the bearer option');
  }
  if (options.auth === 'bearer') {
    if (!isBackendAuthDisabled()) {
      if (!bearerOrigins.has(url.origin))
        throw new TypeError('Unsupported backend bearer origin');
      const token = await getBackendBearerToken();
      if (signal.aborted) return undefined;
      if (token) headers.set('authorization', `Bearer ${token}`);
    }
  }
  if (signal.aborted) return undefined;

  let response: Response;
  try {
    response = await global.fetch(url.toString(), {
      method,
      headers,
      body,
      signal,
      redirect: headers.has('authorization') ? 'error' : undefined,
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
  if (options.responseType === 'none') return undefined;
  try {
    if (options.responseType === 'text') return await response.text();
    const data: unknown = await response.json();
    if (options.responseStruct) assert(data, options.responseStruct);
    return data;
  } catch {
    throw new ParseError();
  }
}

function withMethod(method: string) {
  function call<Data, Schema>(
    url: string | URL,
    options: JsonOptions<Data, Schema>,
  ): Promise<Data>;
  function call(
    url: string | URL,
    options: DefaultOptions & { responseType: 'text' },
  ): Promise<string>;
  function call(
    url: string | URL,
    options: DefaultOptions & { responseType: 'none' },
  ): Promise<void>;
  function call(url: string | URL, options?: DefaultOptions): Promise<unknown>;
  async function call<Data, Schema>(
    url: string | URL,
    options?: ClientOptions<Data, Schema>,
  ): Promise<unknown> {
    return options?.responseStruct
      ? request(method, url, options)
      : request(method, url, options);
  }
  return call;
}

/** One attempt over the app's instrumented global fetch. */
export const httpClient = {
  request,
  get: withMethod('GET'),
  post: withMethod('POST'),
  put: withMethod('PUT'),
  delete: withMethod('DELETE'),
};
