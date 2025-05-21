import { SafeChain } from '../components/UI/NetworkModal';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import Logger from './Logger';

// Cache for known domains
let knownDomainsSet: Set<string> | null = null;
let initPromise: Promise<void> | null = null;
let testDomains: Set<string> | null = null;

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

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const chainsList = await getSafeChainsListFromCacheOnly();
      knownDomainsSet = new Set<string>();

      for (const chain of chainsList) {
        if (chain.rpc && Array.isArray(chain.rpc)) {
          for (const rpcUrl of chain.rpc) {
            try {
              const url = new URL(rpcUrl);
              knownDomainsSet.add(url.hostname.toLowerCase());
            } catch (e) {
              // Skip invalid URLs
              continue;
            }
          }
        }
      }
    } catch (error) {
      knownDomainsSet = new Set<string>();
    }
  })();

  return initPromise;
}

/**
 * Check if a domain is in the known domains list
 *
 * @param domain - The domain to check
 */
export function isKnownDomain(domain: string): boolean {
  const testResult = testDomains?.has(domain?.toLowerCase());
  const knownResult = knownDomainsSet?.has(domain?.toLowerCase());
  return testResult ?? (knownResult ?? false);
}

/**
 * Set known domains for testing
 *
 * @param domains - Set of domains to use for testing
 */
export function setKnownDomainsForTesting(domains: Set<string> | null): void {
  testDomains = domains;
}

/**
 * Extracts the domain from an RPC URL for analytics tracking
 * @param rpcUrl - The RPC URL to extract domain from
 * @returns The domain extracted from the URL, or undefined if the URL is invalid
 */
/**
 * Extracts the domain from an RPC URL for analytics tracking
 * @param rpcUrl - The RPC URL to extract domain from
 * @returns The domain extracted from the URL, or "private" for non-known domains, or "invalid" for invalid URLs
 */
export function extractRpcDomain(rpcUrl: string): string {
  if (!rpcUrl) {
    return 'invalid';
  }
  
  try {
    // Try to parse the URL
    let url: URL;
    
    // Handle URLs without protocol
    if (!rpcUrl.includes('://')) {
      url = new URL(`https://${rpcUrl}`);
    } else {
      url = new URL(rpcUrl);
    }
    
    const domain = url.hostname.toLowerCase();
    
    // Check if this is a known domain
    if (isKnownDomain(domain)) {
      return domain;
    }
    
    // Special case for Infura subdomains - always return the actual domain
    // even if not in the known domains list
    if (domain.includes('infura.io')) {
      return domain;
    }
    
    // Special case for Alchemy subdomains
    if (domain.endsWith('alchemyapi.io')) {
      return domain;
    }
    
    // Special case for local/development nodes
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return 'private';
    }
    
    // For all other domains, return "private" for privacy
    return 'private';
  } catch (error) {
    // If URL parsing fails, return "invalid"
    return 'invalid';
  }
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
    const networkClientId = NetworkController.findNetworkClientIdByChainId(chainId as `0x${string}`);

    if (!networkClientId) {
      return 'unknown';
    }

    // Get network config
    const networkConfig = NetworkController.getNetworkConfigurationByNetworkClientId(networkClientId);

    if (!networkConfig) {
      return 'unknown';
    }

    // Check if there is a direct rpcUrl property (legacy format)
    if ('rpcUrl' in networkConfig && networkConfig.rpcUrl) {
      return typeof networkConfig.rpcUrl === 'string' ? networkConfig.rpcUrl : 'unknown';
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
  } catch (error) {
    console.error('Error getting RPC URL:', error);
    return 'unknown';
  }
}
