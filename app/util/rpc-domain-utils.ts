import { SafeChain } from '../components/UI/NetworkModal';
import StorageWrapper from '../store/storage-wrapper';
import Engine from '../core/Engine';
import { result } from 'lodash';
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
    // Use StorageWrapper instead of AsyncStorage
    const cachedData = await StorageWrapper.getItem('SAFE_CHAINS_CACHE');
    Logger.log('getSafeChainsListFromCacheOnly cachedData:', cachedData ? 'found' : 'not found');

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        Logger.log('Parsed chain data, found', parsed.length, 'chains');
        return parsed;
      } catch (e) {
        Logger.log('Error parsing cached chains data:', e);
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
  Logger.log('initializeRpcProviderDomains called');

  if (initPromise) {
    Logger.log('initPromise already exists, returning');
    return initPromise;
  }

  initPromise = (async () => {
    try {
      Logger.log('Getting chains list from cache');
      const chainsList = await getSafeChainsListFromCacheOnly();
      Logger.log('Chains list from cache:', chainsList.length ? `Found ${chainsList.length} chains` : 'Empty');

      knownDomainsSet = new Set<string>();

      for (const chain of chainsList) {
        if (chain.rpc && Array.isArray(chain.rpc)) {
          for (const rpcUrl of chain.rpc) {
            try {
              const url = new URL(rpcUrl);
              knownDomainsSet.add(url.hostname.toLowerCase());
              Logger.log('Added domain to known set:', url.hostname.toLowerCase());
            } catch (e) {
              // Skip invalid URLs
              continue;
            }
          }
        }
      }

      Logger.log('Known domains initialized:', Array.from(knownDomainsSet));
    } catch (error) {
      Logger.log('Error initializing known domains:', error);
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

  Logger.log('isKnownDomain check for:', domain);
  Logger.log('- testDomains result:', testResult);
  Logger.log('- knownDomainsSet result:', knownResult);
  Logger.log('- testDomains contents:', testDomains ? Array.from(testDomains) : 'null');
  Logger.log('- knownDomainsSet contents:', knownDomainsSet ? Array.from(knownDomainsSet) : 'null');

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
 * Extracts the domain from an RPC endpoint URL with privacy considerations
 *
 * @param rpcUrl - The RPC endpoint URL
 * @returns The domain for known providers, 'private' for private/custom networks, or 'invalid' for invalid URLs
 */
export function extractRpcDomain(rpcUrl: string): string {
  Logger.log('extractRpcDomain input:', rpcUrl);

  if (!knownDomainsSet) {
    // If domains are not initialized, initialize with defaults first
    Logger.log('Known domains not initialized, using defaults');
    knownDomainsSet = new Set(['mainnet.infura.io', 'infura.io', 'eth-mainnet.alchemyapi.io']);

    // Start async initialization for future calls
    initializeRpcProviderDomains().catch(e =>
      Logger.log('Error in background domain initialization:', e)
    );
  }

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
        Logger.log('extractRpcDomain result:', 'localhost');
        return isKnownDomain('localhost') ? 'localhost' : 'private';
      }

      // If parsing fails, check if it looks like a domain without protocol
      if (rpcUrl.includes('://')) {
        Logger.log('extractRpcDomain result:', 'invalid');
        return 'invalid';
      }

      // Handle domain:port format without protocol
      if (rpcUrl.includes(':') && !rpcUrl.includes('//')) {
        const domainPart = rpcUrl.split(':')[0];
        if (domainPart) {
          Logger.log('extractRpcDomain result:', domainPart);
          return isKnownDomain(domainPart.toLowerCase())
            ? domainPart.toLowerCase()
            : 'private';
        }
      }

      // Try adding https:// prefix for domain-like strings
      try {
        url = new URL(`https://${rpcUrl}`);
      } catch (e2) {
        Logger.log('extractRpcDomain result:', result);
        return 'invalid';
      }
    }

    // When checking if domain is known, log the result
    const hostname = url.hostname.toLowerCase();
    const isKnown = isKnownDomain(hostname);
    Logger.log(`Domain ${hostname} is ${isKnown ? 'known' : 'unknown'}`);

    if (isKnown) {
      return hostname;
    }

    return 'private';
  } catch (error) {
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
  Logger.log('getNetworkRpcUrl for chainId:', chainId);
  try {
    const { NetworkController } = Engine.context;

    // Find the network client ID for this chain ID
    const networkClientId = NetworkController.findNetworkClientIdByChainId(chainId as `0x${string}`);

    if (!networkClientId) {
      return 'unknown';
    }

    // Get network configuration
    const networkConfig = NetworkController.getNetworkConfigurationByNetworkClientId(networkClientId);

    if (!networkConfig) {
      return 'unknown';
    }

    // Check if there is a direct rpcUrl property (legacy format)
    if ('rpcUrl' in networkConfig && networkConfig.rpcUrl) {
      return typeof networkConfig.rpcUrl === 'string' ? networkConfig.rpcUrl : 'unknown';
    }

    // Or if it uses rpcEndpoints array
    if (networkConfig.rpcEndpoints?.length > 0) {
      const defaultEndpointIndex = networkConfig.defaultRpcEndpointIndex || 0;
      return (
        networkConfig.rpcEndpoints[defaultEndpointIndex]?.url ||
        networkConfig.rpcEndpoints[0]?.url ||
        'unknown'
      );
    }
    Logger.log('getNetworkRpcUrl result:', 'unknown');
    return 'unknown';
  } catch (error) {
    Logger.log('getNetworkRpcUrl result:', 'unknown');
    Logger.log('getNetworkRpcUrl error:', error);
    console.error('Error getting RPC URL:', error);
    return 'unknown';
  }
}
