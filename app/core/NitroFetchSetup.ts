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
  return (input as Request).url;
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

global.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  nitroFetch(input, withPrefetchKey(input, init));

for (const { url, key } of STARTUP_PREFETCHES) {
  prefetchOnAppStart(url, { prefetchKey: key });
}
