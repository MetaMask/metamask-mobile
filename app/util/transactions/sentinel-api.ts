import { convertHexToDecimal } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

// TODO: Make it configurable via environment variable
const BASE_URL = 'https://tx-sentinel-{0}.api.cx.metamask.io/';
const ENDPOINT_NETWORKS = 'networks';

// In-memory cache for network flags (matches server's cache-control: max-age=300)
const CACHE_TTL_MS = 300_000; // 5 minutes

interface CacheState {
  data: SentinelNetworkMap | null;
  timestamp: number;
  // Pending promise is kept until cache is populated to handle multiple async waves
  pendingPromise: Promise<SentinelNetworkMap> | null;
}

const cache: CacheState = {
  data: null,
  timestamp: 0,
  pendingPromise: null,
};

/**
 * Clears the in-memory cache for network flags.
 * Exported for testing purposes only.
 */
export function clearSentinelNetworkCache(): void {
  cache.data = null;
  cache.timestamp = 0;
  cache.pendingPromise = null;
}

export interface SentinelNetwork {
  name: string;
  group: string;
  chainID: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  network: string;
  explorer: string;
  confirmations: boolean;
  smartTransactions: boolean;
  relayTransactions: boolean;
  hidden: boolean;
  sendBundle: boolean;
}

export type SentinelNetworkMap = Record<string, SentinelNetwork>;

/**
 * Returns all network data.
 * The `/networks` endpoint returns the same data regardless of subdomain,
 * meaning all network subdomains are aliases of the same source.
 *
 * Results are cached in-memory for 5 minutes to match the server's
 * cache-control: max-age=300 header, since React Native's fetch
 * doesn't automatically respect HTTP caching headers.
 *
 * Concurrent requests are deduplicated - if a fetch is already in progress,
 * subsequent callers will receive the same Promise.
 */
function getAllSentinelNetworkFlags(): Promise<SentinelNetworkMap> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cache.data);
  }

  // If a request is already in flight, return that Promise (deduplication)
  // This handles multiple "waves" of async calls
  if (cache.pendingPromise) {
    return cache.pendingPromise;
  }

  // Create and store the pending request
  cache.pendingPromise = fetchNetworkFlags();

  return cache.pendingPromise;
}

/**
 * Fetches network flags from the API and updates the cache.
 * Clears the pending promise after completion to allow cache expiry.
 */
async function fetchNetworkFlags(): Promise<SentinelNetworkMap> {
  try {
    const url = `${buildUrl('ethereum-mainnet')}${ENDPOINT_NETWORKS}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch sentinel network flags: ${response.status} - ${errorBody}`,
      );
    }

    const data: SentinelNetworkMap = await response.json();

    // Update cache BEFORE clearing pending promise
    cache.data = data;
    cache.timestamp = Date.now();

    return data;
  } finally {
    // Clear pending promise after completion (success or failure)
    // This allows cache expiry to trigger a new fetch after TTL
    // Any concurrent callers already have a reference to this promise
    cache.pendingPromise = null;
  }
}

/**
 * Get Sentinel Network flags by chainId
 *
 * @param chainId - The chain ID to get the network flags for.
 * @returns A promise that resolves to the Sentinel network flags for the given chain ID, or undefined if not found.
 */
export async function getSentinelNetworkFlags(
  chainId: Hex,
): Promise<SentinelNetwork | undefined> {
  const chainIdDecimal = convertHexToDecimal(chainId);
  const networks = await getAllSentinelNetworkFlags();
  return networks[chainIdDecimal];
}

/**
 * Returns api base url for a given subdomain.
 *
 * @param subdomain - The subdomain to use in the URL.
 * @returns The complete URL with the subdomain.
 */
export function buildUrl(subdomain: string): string {
  return BASE_URL.replace('{0}', subdomain);
}

/**
 * Returns true if this chain supports sendBundle feature.
 *
 * @param chainId - The chain ID to check.
 * @returns A promise that resolves to true if sendBundle is supported, false otherwise.
 */
export async function isSendBundleSupported(chainId: Hex): Promise<boolean> {
  const network = await getSentinelNetworkFlags(chainId);

  return Boolean(network?.sendBundle);
}

/**
 * Returns a map of chain IDs to whether sendBundle is supported for each chain.
 *
 * @param chainIds - The chain IDs to check.
 * @returns A map of chain IDs to their sendBundle support status.
 */
export async function getSendBundleSupportedChains(
  chainIds: Hex[],
): Promise<Record<string, boolean>> {
  const networkData = await getAllSentinelNetworkFlags();

  return chainIds.reduce<Record<string, boolean>>((acc, chainId) => {
    const chainIdDecimal = convertHexToDecimal(chainId);
    const network = networkData[chainIdDecimal];
    acc[chainId] = Boolean(network?.sendBundle);
    return acc;
  }, {});
}
