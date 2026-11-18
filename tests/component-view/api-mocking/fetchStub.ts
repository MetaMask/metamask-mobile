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

interface FetchPathStub {
  body: unknown;
  status: number;
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

const ensureFetchSpy = (): void => {
  if (installedFetchSpy) {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  installedFetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((url, init) => {
      const key = originAndPath(requestUrl(url));
      const method = requestMethod(url, init);
      const stub =
        (key && (stubs.get(`${key}#${method}`) ?? stubs.get(key))) || undefined;
      if (stub) {
        return Promise.resolve({
          ok: stub.status >= 200 && stub.status < 300,
          status: stub.status,
          statusText: stub.status === 200 ? 'OK' : 'Error',
          json: () => Promise.resolve(stub.body),
        } as Response);
      }
      return originalFetch(url, init);
    });
};

/**
 * Answer `global fetch` for `origin + path` (query string ignored).
 * Pass the same body you give to the nock `.reply` for that route.
 * A later call for the same target replaces the body.
 *
 * `method` scopes the stub to one HTTP method; per-method stubs win over the
 * method-agnostic entry for the same target. Without `method` the stub
 * answers every method.
 */
export function stubFetchPath(
  origin: string,
  path: string,
  body: unknown,
  status = 200,
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
): void {
  stubs.set(stubKey(origin, path, method), { body, status });
  ensureFetchSpy();
}

/**
 * Drop one path. When no paths remain, restore only the spy installed here.
 * With `method`, drop only that method's stub.
 */
export function restoreFetchPath(
  origin: string,
  path: string,
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
): void {
  if (method) {
    stubs.delete(stubKey(origin, path, method));
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
