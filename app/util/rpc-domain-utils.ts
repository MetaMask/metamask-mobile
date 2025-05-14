import { SafeChain } from '../components/UI/NetworkModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache for known domains
let knownDomainsSet: Set<string> | null = null;
let initPromise: Promise<void> | null = null;
let testDomains: Set<string> | null = null;

/**
 * Get the list of safe chains from AsyncStorage cache
 * This allows us to use chain data without making network requests
 */
export async function getSafeChainsListFromCacheOnly(): Promise<SafeChain[]> {
  try {
    // We'll use AsyncStorage to retrieve cached chain data
    // The key should match what's used in useSafeChains.ts
    const cachedData = await AsyncStorage.getItem('SAFE_CHAINS_CACHE');
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return [];
  } catch (error) {
    console.error('Error retrieving chains list from cache', error);
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
      console.error('Error initializing known domains:', error);
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
  return testDomains?.has(domain?.toLowerCase()) ?? (knownDomainsSet?.has(domain?.toLowerCase()) ?? false);
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
 * Extracts the domain from an RPC endpoint URL with privacy considerations
 *
 * @param rpcUrl - The RPC endpoint URL
 * @returns The domain for known providers, 'private' for private/custom networks, or 'invalid' for invalid URLs
 */
export function extractRpcDomain(rpcUrl: string): string {
  if (!rpcUrl) {
    return 'invalid';
  }

  try {
    // Try to parse the URL directly
    let url;
    try {
      url = new URL(rpcUrl);
    } catch (e) {
      // Special case for localhost:port format
      if (rpcUrl.startsWith('localhost:') || rpcUrl.match(/^localhost:\d+$/)) {
        return isKnownDomain('localhost') ? 'localhost' : 'private';
      }

      // If parsing fails, check if it looks like a domain without protocol
      if (rpcUrl.includes('://')) {
        return 'invalid';
      }

      // Handle domain:port format without protocol
      if (rpcUrl.includes(':') && !rpcUrl.includes('//')) {
        const domainPart = rpcUrl.split(':')[0];
        if (domainPart) {
          return isKnownDomain(domainPart.toLowerCase())
            ? domainPart.toLowerCase()
            : 'private';
        }
      }

      // Try adding https:// prefix for domain-like strings
      try {
        url = new URL(`https://${rpcUrl}`);
      } catch (e2) {
        return 'invalid';
      }
    }

    // Check if the domain is known
    if (isKnownDomain(url.hostname)) {
      return url.hostname.toLowerCase();
    }

    return 'private';
  } catch (error) {
    return 'invalid';
  }
}

