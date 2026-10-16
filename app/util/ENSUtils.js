import Engine from '../core/Engine';
import { createPublicClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import {
  ChainId,
  InfuraNetworkType,
  NetworkType,
} from '@metamask/controller-utils';
// One hour cache threshold.
const CACHE_REFRESH_THRESHOLD = 60 * 60 * 1000;
import { regex } from '../../app/util/regex';

/**
 * Utility class with the single responsibility
 * of caching ENS names
 *
 * TODO: Replace this entire module and cache with the core ENS controller
 */
export class ENSCache {
  static cache = {};
}

/**
 * A list of all chain IDs on which this module resolves ENS names.
 */
const ENS_SUPPORTED_CHAIN_IDS = [ChainId[NetworkType.mainnet]];

/**
 * Network IDs used as cache key prefixes (kept for cache compatibility).
 */
const ENS_SUPPORTED_NETWORK_IDS = {
  [InfuraNetworkType.mainnet]: '1',
};

/**
 * A map of chain ID to network ID for networks supported by this module.
 */
const CHAIN_ID_TO_NETWORK_ID = {
  [ChainId[NetworkType.mainnet]]:
    ENS_SUPPORTED_NETWORK_IDS[NetworkType.mainnet],
};

/**
 * A map of chain ID to the viem chain definition, which carries the ENS
 * Universal Resolver address used for resolution.
 */
const CHAIN_ID_TO_VIEM_CHAIN = {
  [ChainId[NetworkType.mainnet]]: mainnet,
};

/**
 * Build a viem public client on top of the current network provider.
 *
 * Resolution goes through the ENS Universal Resolver, which walks up the name
 * (ENSIP-10) and follows CCIP-Read, so names whose records live on a wildcard
 * or offchain resolver, including names migrated to ENSv2, resolve correctly.
 * A direct `registry.resolver(namehash(name))` read of the name's own node
 * does not: for a migrated name the v1 registry returns the zero address.
 *
 * @param {string} chainId - The chain ID to resolve on.
 * @returns {import('viem').PublicClient|undefined} The client, or undefined
 * if the chain is not supported.
 */
function getEnsClient(chainId) {
  const chain = CHAIN_ID_TO_VIEM_CHAIN[chainId];
  if (!chain) {
    return undefined;
  }
  const { provider } =
    Engine.context.NetworkController.getProviderAndBlockTracker();
  return createPublicClient({ chain, transport: custom(provider) });
}

/**
 * Get a cached ENS name.
 *
 * @param {string} address - The address to lookup.
 * @param {string} chainId - The chain ID for the cached ENS name.
 * @returns {string|undefined} The cached ENS name, or undefined if the name
 * was not found in the cache.
 */
export function getCachedENSName(address, chainId) {
  const networkHasEnsSupport = ENS_SUPPORTED_CHAIN_IDS.includes(chainId);
  if (!networkHasEnsSupport) {
    return undefined;
  }

  const networkId = CHAIN_ID_TO_NETWORK_ID[chainId];
  const cacheEntry = ENSCache.cache[networkId + address];

  return cacheEntry?.name;
}

/**
 * Reverse-resolve an address to its ENS primary name.
 *
 * viem's `getEnsName` reads the reverse record and verifies it with a forward
 * lookup through the Universal Resolver, so an unverified name is never
 * returned.
 *
 * @param {string} address - The address to lookup.
 * @param {string} chainId - The chain ID to resolve on.
 * @returns {Promise<string|undefined>} The primary name, or undefined.
 */
export async function doENSReverseLookup(address, chainId) {
  const { name: cachedName, timestamp } =
    ENSCache.cache[chainId + address] || {};
  const nowTimestamp = Date.now();
  if (timestamp && nowTimestamp - timestamp < CACHE_REFRESH_THRESHOLD) {
    return Promise.resolve(cachedName);
  }

  const client = getEnsClient(chainId);
  if (!client) {
    return undefined;
  }

  const networkId = CHAIN_ID_TO_NETWORK_ID[chainId];
  try {
    const name = await client.getEnsName({ address });
    if (name) {
      ENSCache.cache[networkId + address] = { name, timestamp: Date.now() };
      return name;
    }
    ENSCache.cache[networkId + address] = { timestamp: Date.now() };
  } catch (e) {
    // Transport or contract errors: leave the cache untouched so the next
    // call retries.
  }
  return undefined;
}

/**
 * Forward-resolve an ENS name to an address.
 *
 * @param {string} ensName - The ENS name to resolve.
 * @param {string} chainId - The chain ID to resolve on.
 * @returns {Promise<string|undefined>} The address, or undefined if the name
 * does not resolve.
 */
export async function doENSLookup(ensName, chainId) {
  const client = getEnsClient(chainId);
  if (!client) {
    return undefined;
  }

  try {
    const resolvedAddress = await client.getEnsAddress({
      name: normalize(ensName),
    });
    return resolvedAddress || undefined;
  } catch (e) {
    // Invalid name (normalize throws) or resolution error.
    return undefined;
  }
}

export function isDefaultAccountName(name) {
  return regex.defaultAccount.test(name);
}
