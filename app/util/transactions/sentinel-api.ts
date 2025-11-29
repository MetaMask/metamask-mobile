import { convertHexToDecimal } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

// TODO: Make it configurable via environment variable
const BASE_URL = 'https://tx-sentinel-{0}.api.cx.metamask.io/';
const ENDPOINT_NETWORKS = 'networks';

// In-memory cache for network flags (matches server's cache-control: max-age=300)
const CACHE_TTL_MS = 300_000; // 5 minutes
let cachedNetworkFlags: SentinelNetworkMap | null = null;
let cacheTimestamp = 0;

/**
 * Clears the in-memory cache for network flags.
 * Exported for testing purposes only.
 */
export function clearSentinelNetworkCache(): void {
  cachedNetworkFlags = null;
  cacheTimestamp = 0;
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
 */
async function getAllSentinelNetworkFlags(): Promise<SentinelNetworkMap> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedNetworkFlags && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedNetworkFlags;
  }

  const url = `${buildUrl('ethereum-mainnet')}${ENDPOINT_NETWORKS}`;
  const response = await fetch(url);
  const data: SentinelNetworkMap = await response.json();

  // Update cache
  cachedNetworkFlags = data;
  cacheTimestamp = now;

  return data;
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
