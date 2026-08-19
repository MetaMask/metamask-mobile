/**
 * NitroFetchSetup — replaces global.fetch with nitro-fetch and registers
 * critical startup endpoints for native prefetching on cold start.
 *
 * Per the nitro-fetch docs, prefetchOnAppStart pre-warms URLs natively before
 * JS loads. Consuming fetch() calls must pass { headers: { prefetchKey } } to
 * hit the in-memory FetchCache. The wrapper below injects that header
 * automatically for registered URLs so upstream controllers that use
 * global.fetch need no changes.
 *
 * Note: prefetchOnAppStart() only seeds the queue for the NEXT cold launch —
 * JS must run once before the native side knows what to prefetch. First-launch
 * (fresh install) prefetching is handled by native-side registerPrefetch()
 * calls in MainApplication.kt (Android) and AppDelegate.swift (iOS), which
 * write the same URLs into the persistent queue before JS boots.
 *
 * https://fetch.margelo.com — "Prefetching for the next app launch"
 *
 */
import {
  fetch as nitroFetch,
  prefetchOnAppStart,
  Headers as NitroHeaders,
  Request,
  Response,
} from 'react-native-nitro-fetch';
import { hasTestOverrides } from '../util/test/utils';
import { ClientType } from '@metamask/remote-feature-flag-controller';
import {
  C2_DOMAIN_BLOCKLIST_URL,
  METAMASK_STALELIST_URL,
} from '@metamask/phishing-controller';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from './Engine/controllers/remote-feature-flag-controller/utils';

/**
 * Single source of truth for startup prefetches.
 *
 * url - full URL passed to prefetchOnAppStart (may include query params)
 * urlPrefix - prefix used to match consuming fetch() calls; stripping query
 * params allows dynamic suffixes like ?timestamp= to still match
 * key - stable prefetchKey shared between registration and consumption
 *
 * Adding an entry here automatically registers it AND wires up the cache hit.
 * You cannot add one without the other.
 */
const STARTUP_PREFETCHES = [
  {
    url:
      `https://client-config.api.cx.metamask.io/v1/flags` +
      `?client=${ClientType.Mobile}` +
      `&distribution=${getFeatureFlagAppDistribution()}` +
      `&environment=${getFeatureFlagAppEnvironment()}`,
    urlPrefix: 'https://client-config.api.cx.metamask.io/v1/flags',
    key: 'feature-flags',
  },
  {
    url: METAMASK_STALELIST_URL,
    urlPrefix: METAMASK_STALELIST_URL,
    key: 'phishing-stalelist',
  },
  {
    url: C2_DOMAIN_BLOCKLIST_URL,
    urlPrefix: C2_DOMAIN_BLOCKLIST_URL,
    key: 'phishing-c2-blocklist',
  },
] as const;

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url ?? '';
}

/**
 * Injects the prefetchKey header required by nitro-fetch to serve the
 * in-memory FetchCache hit. Returns init unchanged when no match is found.
 */
function withPrefetchKey(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestInit | undefined {
  const url = getUrl(input);

  const entry = STARTUP_PREFETCHES.find(({ urlPrefix }) =>
    url.startsWith(urlPrefix),
  );

  if (!entry) return init;

  const headers = new Headers(init?.headers);

  if (!headers.has('prefetchKey')) {
    headers.set('prefetchKey', entry.key);
  }

  return { ...init, headers };
}

/**
 * nitro-fetch's buildNitroRequest discards ArrayBuffer/Uint8Array bodies
 * (it hardcodes `bodyBytes: undefined` after normalising them). Some
 * third-party libraries — most notably ethers v5's JsonRpcProvider — encode
 * their JSON-RPC request body as Uint8Array via toUtf8Bytes(json) and rely on
 * global.fetch forwarding it correctly. Without this shim those POSTs reach
 * the RPC endpoint with no body, returning {"error":{"code":-32700,"message":
 * "Invalid JSON"}}.
 *
 * Since every JSON-RPC body is valid UTF-8, converting Uint8Array → string
 * is always safe here. ArrayBuffer is handled the same way.
 */
function normalizeBodyForNitroFetch(
  init?: RequestInit,
): RequestInit | undefined {
  const body = init?.body;
  if (body instanceof Uint8Array) {
    return { ...init, body: new TextDecoder().decode(body) };
  }
  if (body instanceof ArrayBuffer) {
    return { ...init, body: new TextDecoder().decode(new Uint8Array(body)) };
  }
  return init;
}

function installProductionNitroFetch(): void {
  // NOTE: nitro-fetch uses a buffered transport by default — the full response
  // body is downloaded natively before the Promise resolves. `response.body.getReader()`
  // is API-compatible (returns a ReadableStream that delivers all bytes in one chunk)
  // but does NOT stream incrementally. For true streaming use either:
  //   - `{ stream: true }` in fetch options (nitro-fetch Cronet streaming transport)
  //   - import `fetch` from 'expo/fetch' directly (see bridge-controller-init.ts)
  global.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    nitroFetch(input, withPrefetchKey(input, normalizeBodyForNitroFetch(init)));
  const _g = globalThis as unknown as {
    Headers: typeof NitroHeaders;
    Request: typeof Request;
    Response: typeof Response;
  };
  _g.Headers = NitroHeaders;
  _g.Request = Request;
  _g.Response = Response;

  for (const { url, key } of STARTUP_PREFETCHES) {
    // Non-fatal: a registration failure means the cache is cold on next launch,
    // not that the request fails — swallow so it never becomes an unhandled rejection.
    prefetchOnAppStart(url, { prefetchKey: key }).catch(() => undefined);
  }
}

if (!hasTestOverrides) {
  installProductionNitroFetch();
}
