import { SafeChain } from '../components/hooks/useSafeChains';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import Logger from './Logger';

// Cache for known domains
let knownDomainsSet: Set<string> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Get module state - encapsulates access to internal state
 */
export function getModuleState() {
  return {
    knownDomainsSet,
    initPromise,
    setKnownDomainsSet: (value: Set<string> | null) => {
      knownDomainsSet = value;
    },
    setInitPromise: (value: Promise<void> | null) => {
      initPromise = value;
    },
  };
}

/**
 * Get the list of safe chains from cache only
 * This allows us to use chain data without making network requests
 */
export async function getSafeChainsListFromCacheOnly(): Promise<SafeChain[]> {
  try {
    const cachedData = await StorageWrapper.getItem('SAFE_CHAINS_CACHE');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed;
      } catch (error) {
        Logger.log('Error parsing cached chains data:', error);
      }
    }
    return [];
  } catch (error) {
    Logger.log('Error retrieving chains list from cache:', error);
    return [];
  }
}

/**
 * Initialize the set of known domains from the chains list
 */
export async function initializeRpcProviderDomains(): Promise<void> {
  const state = getModuleState();
  if (state.initPromise) {
    return state.initPromise;
  }
  const promise = (async () => {
    try {
      const chainsList = await getSafeChainsListFromCacheOnly();
      const newKnownDomainsSet = new Set<string>();

      for (const chain of chainsList) {
        if (chain.rpc && Array.isArray(chain.rpc)) {
          for (const rpcUrl of chain.rpc) {
            try {
              const url = new URL(rpcUrl);
              newKnownDomainsSet.add(url.hostname.toLowerCase());
            } catch (e) {
              continue; // Skip invalid URLs
            }
          }
        }
      }
      state.setKnownDomainsSet(newKnownDomainsSet);
    } catch (error) {
      state.setKnownDomainsSet(new Set<string>());
    }
  })();

  state.setInitPromise(promise);
  return promise;
}

/**
 * Get the current set of known domains
 * @returns The set of known domains or null if not initialized
 */
export function getKnownDomains(): Set<string> | null {
  return getModuleState().knownDomainsSet;
}

/**
 * Check if a domain is in the known domains list
 *
 * @param domain - The domain to check
 */
export function isKnownDomain(domain: string): boolean {
  const state = getModuleState();
  return state.knownDomainsSet?.has(domain?.toLowerCase()) ?? false;
}

export const RpcDomainStatus = {
  Invalid: 'invalid',
  Private: 'private',
  Unknown: 'unknown',
} as const;

export type RpcDomainStatus =
  (typeof RpcDomainStatus)[keyof typeof RpcDomainStatus];

function parseDomain(url: string): string | undefined {
  try {
    const normalizedUrl = url.includes('://') ? url : `https://${url}`;
    return new URL(normalizedUrl).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

// Allowed provider domains for RPC endpoint validation
const ALLOWED_PROVIDER_DOMAINS = new Set(['infura.io', 'alchemyapi.io']);

/**
 * Check if a hostname is an allowed provider domain or legitimate subdomain
 * @param hostname - The hostname to check
 * @returns True if the hostname is allowed, false otherwise
 */
function isAllowedProviderDomain(hostname: string): boolean {
  // Check exact match first
  if (ALLOWED_PROVIDER_DOMAINS.has(hostname)) {
    return true;
  }

  // Check if it's a legitimate subdomain of any allowed domain
  return [...ALLOWED_PROVIDER_DOMAINS].some((allowedDomain) =>
    hostname.endsWith(`.${allowedDomain}`),
  );
}

/**
 * Extracts the domain from an RPC URL for analytics tracking
 * @param rpcUrl - The RPC URL to extract domain from
 * @returns The domain extracted from the URL, or "private" for non-known domains, or "invalid" for invalid URLs
 */
export function extractRpcDomain(rpcUrl: string): RpcDomainStatus | string {
  const domain = parseDomain(rpcUrl);
  if (!domain) {
    return RpcDomainStatus.Invalid;
  }

  // Check if this is a known domain
  if (isKnownDomain(domain)) {
    return domain;
  }

  // Check if it's an allowed provider domain (Infura, Alchemy, etc.)
  if (isAllowedProviderDomain(domain)) {
    return domain;
  }

  // Special case for local/development nodes
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return RpcDomainStatus.Private;
  }

  // For all other domains, return "private" for privacy
  return RpcDomainStatus.Private;
}

/**
 * Gets the RPC URL for a specific chain ID from the NetworkController
 *
 * @param chainId - The chain ID to get the RPC URL for
 * @returns The RPC URL for the chain, or 'unknown' if not found
 */
export function getNetworkRpcUrl(chainId: string): string {
  try {
    const { NetworkController } = Engine.context;

    // Find network clientID for chainID
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      chainId as `0x${string}`,
    );
    if (!networkClientId) {
      return 'unknown';
    }

    // Get network config
    const networkConfig =
      NetworkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );
    if (!networkConfig) {
      return 'unknown';
    }

    // Check if there is a direct rpcUrl property (legacy format)
    if ('rpcUrl' in networkConfig && networkConfig.rpcUrl) {
      return typeof networkConfig.rpcUrl === 'string'
        ? networkConfig.rpcUrl
        : 'unknown';
    }

    // If we use rpcEndpoints array
    if (networkConfig.rpcEndpoints?.length > 0) {
      const defaultEndpointIndex = networkConfig.defaultRpcEndpointIndex || 0;
      return (
        networkConfig.rpcEndpoints[defaultEndpointIndex]?.url ||
        networkConfig.rpcEndpoints[0]?.url ||
        'unknown'
      );
    }
    return 'unknown';
  } catch (error: unknown) {
    Logger.error(
      error instanceof Error
        ? error
        : new Error(`Error getting RPC URL: ${String(error)}`),
    );
    return 'unknown';
  }
}
