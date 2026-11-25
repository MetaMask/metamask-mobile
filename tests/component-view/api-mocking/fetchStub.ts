/**
 * Shared fetch stub for component-view API mocks.
 *
 * Nock is still the documented interceptor (`nockHelpers.ts`). Undici
 * `fetch` is not always settled by that interceptor, which leaves React
 * Query `isInitialLoading` true. Feature setup helpers should register the
 * same payload here instead of installing their own `globalThis.fetch` spy.
 *
 * `restoreFetchPath` calls `mockRestore()` on the spy this module installed.
 * It does not restore whatever spy happens to be on `globalThis.fetch`.
 */

interface DeferredResponse {
  promise: Promise<void>;
  resolve: (body: unknown, status?: number) => void;
  reject: (error: unknown) => void;
}

interface FetchPathStub {
  body: unknown;
  status: number;
  headers?: Record<string, string>;
  deferred?: DeferredResponse;
  onRequest?: (request: { method: string; body: unknown; url: string }) => void;
}

export interface FetchPathStubOptions {
  /** Scope the stub to one HTTP method; per-method stubs win over the method-agnostic entry for the same target. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Headers the stubbed response exposes through `headers.get()`. */
  headers?: Record<string, string>;
  /** Observe the requests this stub answers (method + raw body). */
  onRequest?: (request: { method: string; body: unknown; url: string }) => void;
}

/** Resolves or rejects one deferred response, once. */
export interface FetchPathDeferred {
  respond: (body: unknown, status?: number) => void;
  fail: (error: unknown) => void;
}

const stubs = new Map<string, FetchPathStub>();

let installedFetchSpy: {
  mockRestore: () => void;
} | null = null;

const requestUrl = (url: RequestInfo | URL): string => {
  if (typeof url === 'string') {
    return url;
  }
  if (url instanceof URL) {
    return url.toString();
  }
  return url.url;
};

const requestMethod = (url: RequestInfo | URL, init?: RequestInit): string =>
  (init?.method ?? (url instanceof Request ? url.method : 'GET')).toUpperCase();

/**
 * Origin + path, without query or hash. Matching the full target avoids
 * answering a different host that happens to use the same path.
 */
const originAndPath = (href: string): string | null => {
  try {
    const parsed = new URL(href);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
};

const stubKey = (origin: string, path: string, method?: string): string =>
  method ? `${origin}${path}#${method}` : `${origin}${path}`;

const stubResponseBody = (body: unknown): string =>
  typeof body === 'string' ? body : JSON.stringify(body);

/**
 * A Response-shaped object with the body readers the real API clients use:
 * `json()`, `text()`, and `headers.get()`. Deferred stubs await their gate
 * before this object exists.
 */
const toResponse = (stub: FetchPathStub): Response => {
  const text = stubResponseBody(stub.body);
  const headers = new Map(
    Object.entries(stub.headers ?? {}).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ]),
  );
  return {
    ok: stub.status >= 200 && stub.status < 300,
    status: stub.status,
    statusText: stub.status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text) as unknown),
  } as Response;
};

const ensureFetchSpy = (): void => {
  if (installedFetchSpy) {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  installedFetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, init) => {
      const key = originAndPath(requestUrl(url));
      const method = requestMethod(url, init);
      const stub =
        (key && (stubs.get(`${key}#${method}`) ?? stubs.get(key))) || undefined;
      if (stub) {
        stub.onRequest?.({ method, body: init?.body, url: requestUrl(url) });
        await stub.deferred?.promise;
        return toResponse(stub);
      }
      return originalFetch(url, init);
    });
};

/**
 * Answer `global fetch` for `origin + path` (query string ignored).
 * Pass the same body you give to the nock `.reply` for that route.
 * A later call for the same target replaces the body.
 *
 * Without `options.method` the stub answers every method; with it, the stub
 * only answers that method and wins over the method-agnostic entry.
 */
export function stubFetchPath(
  origin: string,
  path: string,
  body: unknown,
  status = 200,
  options?: FetchPathStubOptions,
): void {
  stubs.set(stubKey(origin, path, options?.method), {
    body,
    status,
    headers: options?.headers,
    onRequest: options?.onRequest,
  });
  ensureFetchSpy();
}

/**
 * Answer `global fetch` for `origin + path` only after `respond` or `fail`.
 * Registers the target immediately, so the request is observably pending
 * until the test settles it. Use `respond` to replace a later stub response
 * or to hold a read open while another one is asserted.
 */
export function stubFetchPathDeferred(
  origin: string,
  path: string,
  options?: FetchPathStubOptions,
): FetchPathDeferred {
  // The repo's TS lib predates ES2024's `Promise.withResolvers` type.
  const promiseWithResolvers = Promise as unknown as {
    withResolvers<Value>(): {
      promise: Promise<Value>;
      resolve: (value: Awaited<Value> | PromiseLike<Awaited<Value>>) => void;
      reject: (reason?: unknown) => void;
    };
  };
  const { promise, resolve, reject } =
    promiseWithResolvers.withResolvers<void>();
  let settled = false;
  const settle = (callback: () => void): void => {
    if (settled) {
      return;
    }
    settled = true;
    callback();
  };
  const stub: FetchPathStub = {
    body: undefined,
    status: 200,
    headers: options?.headers,
    onRequest: options?.onRequest,
    deferred: {
      promise,
      resolve: (body, status = 200) =>
        settle(() => {
          stub.body = body;
          stub.status = status;
          resolve();
        }),
      reject: (error) =>
        settle(() => {
          reject(error);
        }),
    },
  };
  stubs.set(stubKey(origin, path, options?.method), stub);
  ensureFetchSpy();
  return {
    respond: (body, status) => stub.deferred?.resolve(body, status),
    fail: (error) => stub.deferred?.reject(error),
  };
}

/**
 * Drop one path. When no paths remain, restore only the spy installed here.
 * With `options.method`, drop only that method's stub.
 */
export function restoreFetchPath(
  origin: string,
  path: string,
  options?: Pick<FetchPathStubOptions, 'method'>,
): void {
  if (options?.method) {
    stubs.delete(stubKey(origin, path, options.method));
  } else {
    const prefix = `${origin}${path}`;
    for (const key of Array.from(stubs.keys())) {
      if (key === prefix || key.startsWith(`${prefix}#`)) {
        stubs.delete(key);
      }
    }
  }
  if (stubs.size > 0 || !installedFetchSpy) {
    return;
  }
  installedFetchSpy.mockRestore();
  installedFetchSpy = null;
}
