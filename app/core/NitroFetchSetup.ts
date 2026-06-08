/**
 * NitroFetchSetup — replaces global.fetch with nitro-fetch and registers
 * critical startup endpoints for native prefetching on cold start.
 *
 * Per the nitro-fetch docs, prefetchOnAppStart pre-warms URLs natively before
 * JS loads.  Consuming fetch() calls must pass { headers: { prefetchKey } } to
 * hit the in-memory FetchCache.  The wrapper below injects that header
 * automatically for registered URLs so upstream controllers that use
 * global.fetch need no changes.
 *
 * https://fetch.margelo.com — "Prefetching for the next app launch"
 */
import {
  fetch as nitroFetch,
  prefetchOnAppStart,
} from 'react-native-nitro-fetch';
import { ClientType } from '@metamask/remote-feature-flag-controller';
import {
  C2_DOMAIN_BLOCKLIST_URL,
  METAMASK_STALELIST_URL,
} from '@metamask/phishing-controller';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from './Engine/controllers/remote-feature-flag-controller/utils';

const FEATURE_FLAGS_URL =
  `https://client-config.api.cx.metamask.io/v1/flags` +
  `?client=${ClientType.Mobile}` +
  `&distribution=${getFeatureFlagAppDistribution()}` +
  `&environment=${getFeatureFlagAppEnvironment()}`;

// URL-prefix → prefetchKey map (matches the keys registered below).
const PREFETCH_KEY_MAP: [string, string][] = [
  ['https://client-config.api.cx.metamask.io/v1/flags', 'feature-flags'],
  [METAMASK_STALELIST_URL, 'phishing-stalelist'],
  [C2_DOMAIN_BLOCKLIST_URL, 'phishing-c2-blocklist'],
];

// Injects the prefetchKey header required by nitro-fetch to serve the
// in-memory cache hit.  Returns init unchanged when no match is found.
function withPrefetchKey(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestInit | undefined {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  const match = PREFETCH_KEY_MAP.find(([prefix]) => url.startsWith(prefix));
  if (!match) return init;

  const headers = new Headers(init?.headers);
  if (headers.has('prefetchKey')) return init;
  headers.set('prefetchKey', match[1]);
  return { ...init, headers };
}

global.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  nitroFetch(input, withPrefetchKey(input, init));

prefetchOnAppStart(FEATURE_FLAGS_URL, { prefetchKey: 'feature-flags' });
prefetchOnAppStart(METAMASK_STALELIST_URL, {
  prefetchKey: 'phishing-stalelist',
});
prefetchOnAppStart(C2_DOMAIN_BLOCKLIST_URL, {
  prefetchKey: 'phishing-c2-blocklist',
});
