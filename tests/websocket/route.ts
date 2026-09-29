// Pure WebSocket URL-routing decision logic, shared by shim.js's WS patch.
//
// The e2e shim rewrites `global.WebSocket` so that:
// - URLs matching a `WS_SERVICES` config prefix are rewritten to that
//   service's dedicated local mock server (per-service port), exactly as
//   before this helper existed.
// - Any other `ws://` / `wss://` URL falls back to the central e2e mock
//   server's `/proxy-ws` upgrade path, mirroring the `/proxy` HTTP path:
//   `ws://localhost:<mockServerPort>/proxy-ws?url=<encodeURIComponent(original)>`.
// - Local URLs, URLs already pointing at the mock server (or containing
//   `/proxy`), performance-build bypass URLs, and non-string values pass
//   through untouched.
//
// This module is intentionally dependency-free so it can be unit tested
// with plain Jest (see `route.test.ts`) and imported by shim.js.

/** Map of production URL prefix → local mock URL (built from WS_SERVICES). */
export type WebSocketRoutes = Record<string, string>;

/** Hostnames that must never be rewritten to the mock server. */
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '10.0.2.2'];

/**
 * Whether the URL points at a local host (loopback or Android emulator host).
 * Parse failures (e.g. malformed URLs) are treated as not-local so the
 * caller can decide what to do next.
 */
function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTNAMES.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Resolve the final WebSocket URL to connect to for a given constructor URL.
 *
 * @param url - The URL argument passed to the WebSocket constructor. May be
 * anything the caller received; only strings are ever rewritten.
 * @param wsRoutes - Exact-prefix route table (production URL prefix → local
 * mock URL). First matching prefix wins.
 * @param mockServerPort - Port of the central e2e mock server (the same
 * `-mockServerPort` launch arg used by the `/proxy` HTTP path).
 * @param shouldBypassProxy - Optional predicate mirroring the shim's
 * performance-build proxy bypass (e.g. live TOPRF auth hosts). When it
 * returns true, the URL is passed through untouched.
 * @returns The URL to hand to the original WebSocket constructor: either a
 * rewritten string or the original value unchanged.
 */
export function resolveWebSocketTarget(
  url: unknown,
  wsRoutes: WebSocketRoutes,
  mockServerPort: string | number,
  shouldBypassProxy?: (targetUrl: string) => boolean,
): unknown {
  if (typeof url !== 'string') {
    return url;
  }

  // 1. Exact-prefix service routes win over the generic fallback.
  for (const [prefix, localUrl] of Object.entries(wsRoutes)) {
    if (url.startsWith(prefix)) {
      return localUrl;
    }
  }

  // 2. Exemptions — mirror the XHR patch: never loop local traffic, the mock
  // server itself, anything already proxied, or performance-build bypasses.
  const isMockServerUrl = url.includes(`localhost:${mockServerPort}`);
  const isProxiedUrl = url.includes('/proxy');
  if (
    isLocalUrl(url) ||
    isMockServerUrl ||
    isProxiedUrl ||
    shouldBypassProxy?.(url)
  ) {
    return url;
  }

  // 3. Generic fallback: route unmatched ws/wss URLs through the central
  // mock server's WebSocket upgrade path, carrying the original URL in the
  // `url` query param.
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return `ws://localhost:${mockServerPort}/proxy-ws?url=${encodeURIComponent(
      url,
    )}`;
  }

  return url;
}
