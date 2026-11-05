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

const ensureFetchSpy = (): void => {
  if (installedFetchSpy) {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  installedFetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((url, init) => {
      const key = originAndPath(requestUrl(url));
      const stub = key ? stubs.get(key) : undefined;
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
 */
export function stubFetchPath(
  origin: string,
  path: string,
  body: unknown,
  status = 200,
): void {
  stubs.set(`${origin}${path}`, { body, status });
  ensureFetchSpy();
}

/**
 * Drop one path. When no paths remain, restore only the spy installed here.
 */
export function restoreFetchPath(origin: string, path: string): void {
  stubs.delete(`${origin}${path}`);
  if (stubs.size > 0 || !installedFetchSpy) {
    return;
  }
  installedFetchSpy.mockRestore();
  installedFetchSpy = null;
}
