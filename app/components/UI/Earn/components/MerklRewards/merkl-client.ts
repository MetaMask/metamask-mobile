import { Hex } from '@metamask/utils';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Interface } from '@ethersproject/abi';
import Engine from '../../../../../core/Engine';
import { TokenI } from '../../../Tokens/types';
import {
  AGLAMERKL_ADDRESS_MAINNET,
  AGLAMERKL_ADDRESS_LINEA,
  MERKL_API_BASE_URL,
  MERKL_DISTRIBUTOR_ADDRESS,
  DISTRIBUTOR_CLAIMED_ABI,
  MERKL_REWARDS_CACHE_TTL_MS,
} from './constants';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../constants/musd';

// mUSD token address (same on all chains)
const MUSD_TOKEN_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];

/**
 * Merkl API reward data structure
 */
export interface MerklRewardData {
  rewards: {
    token: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      price: number | null;
    };
    pending: string;
    proofs: string[];
    amount: string;
    claimed: string;
    recipient: string;
  }[];
}

// ---------------------------------------------------------------------------
// In-memory cache for Merkl rewards API responses
// Follows the Sentinel API caching pattern (TTL + request deduplication).
//
// The display hook (useMerklRewards) fetches on mount, warming the cache.
// When the user taps "Claim bonus", useMerklClaim hits the warm cache
// instead of waiting for a fresh network round-trip.
// ---------------------------------------------------------------------------

interface MerklCacheEntry {
  data: MerklRewardData[];
  timestamp: number;
}

/** Cached responses keyed by request URL */
const merklCache = new Map<string, MerklCacheEntry>();

/** In-flight requests keyed by URL for deduplication */
const pendingRequests = new Map<string, Promise<MerklRewardData[]>>();

/**
 * Clear the entire Merkl rewards cache.
 * Call after a successful claim so the next fetch reflects the new on-chain state.
 */
export const clearMerklRewardsCache = (): void => {
  merklCache.clear();
  // Pending requests are intentionally left alone — callers already
  // hold references to those promises and will get the in-flight result.
};

/**
 * Fetch raw Merkl reward data with caching and request deduplication.
 *
 * 1. If a cached response exists and is within TTL → return immediately.
 * 2. If an identical request is already in-flight → return that promise (dedup).
 * 3. Otherwise, fire a new request, cache the result, and return.
 *
 * **Signal handling**: The `signal` is intentionally NOT forwarded to the
 * underlying `fetch()`. Because concurrent requests are deduplicated into a
 * single promise, forwarding one caller's signal would abort the shared
 * request for *all* callers. Instead, each caller's signal is checked after
 * the shared promise settles, so aborting one consumer never affects others.
 */
const fetchMerklRewardsCached = async (
  url: string,
  signal?: AbortSignal,
): Promise<MerklRewardData[]> => {
  // Respect the caller's abort signal before doing any work
  signal?.throwIfAborted();

  // 1. Check cache
  const cached = merklCache.get(url);
  if (cached && Date.now() - cached.timestamp < MERKL_REWARDS_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Deduplicate concurrent requests to the same URL
  const pending = pendingRequests.get(url);
  if (pending) {
    // Await the shared promise, then honour *this* caller's signal
    const data = await pending;
    signal?.throwIfAborted();
    return data;
  }

  // 3. Fire a new request — no signal passed so one caller can't cancel for all
  const request = (async (): Promise<MerklRewardData[]> => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch Merkl rewards: ${response.status}`);
      }

      const data: MerklRewardData[] = await response.json();

      // Populate cache before clearing the pending slot
      merklCache.set(url, { data, timestamp: Date.now() });

      return data;
    } finally {
      // Clear pending slot so cache TTL governs the next fetch
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, request);

  const data = await request;
  // Honour this caller's signal after the shared request completes
  signal?.throwIfAborted();
  return data;
};

/**
 * Options for fetching Merkl rewards
 */
export interface FetchMerklRewardsOptions {
  userAddress: string;
  /** Single chainId or array of chainIds to fetch rewards from */
  chainIds: Hex | Hex[];
  tokenAddress: Hex;
  signal?: AbortSignal;
}

/**
 * Build the Merkl API URL for fetching rewards
 * @param chainIds - Single chainId or array of chainIds (CSV format in URL)
 */
const buildRewardsUrl = (
  userAddress: string,
  chainIds: Hex | Hex[],
  tokenAddress: Hex,
): string => {
  // Support multiple chain IDs (comma-separated)
  const chainIdParam = Array.isArray(chainIds)
    ? chainIds.map((id) => Number(id)).join(',')
    : Number(chainIds);

  let url = `${MERKL_API_BASE_URL}/users/${userAddress}/rewards?chainId=${chainIdParam}`;

  // Add test parameter for test token (case-insensitive comparison)
  if (
    tokenAddress.toLowerCase() === AGLAMERKL_ADDRESS_MAINNET.toLowerCase() ||
    tokenAddress.toLowerCase() === AGLAMERKL_ADDRESS_LINEA.toLowerCase()
  ) {
    url += '&test=true';
  }

  return url;
};

/**
 * Find the matching reward for a given token address in the API response
 * Searches through all data array elements, not just data[0]
 */
const findMatchingReward = (
  data: MerklRewardData[],
  tokenAddress: Hex,
): MerklRewardData['rewards'][0] | null => {
  const tokenAddressLower = (tokenAddress as string).toLowerCase();

  for (const dataEntry of data) {
    const matchingReward = dataEntry?.rewards?.find(
      (reward) => reward.token.address.toLowerCase() === tokenAddressLower,
    );
    if (matchingReward) {
      return matchingReward;
    }
  }

  return null;
};

/**
 * Fetch Merkl rewards from the API for a given user and token
 * @param options - Fetch options including user address, chain IDs, and token address
 * @param options.throwOnError - If true, throws on API errors. If false, returns null on errors (default: true)
 * @returns The matching reward data or null if not found or if error occurs (when throwOnError is false)
 * @throws Error if the API request fails and throwOnError is true
 */
export const fetchMerklRewards = async (
  { userAddress, chainIds, tokenAddress, signal }: FetchMerklRewardsOptions,
  throwOnError = true,
): Promise<MerklRewardData['rewards'][0] | null> => {
  const url = buildRewardsUrl(userAddress, chainIds, tokenAddress);

  try {
    const data = await fetchMerklRewardsCached(url, signal);
    return findMatchingReward(data, tokenAddress);
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    return null;
  }
};

/**
 * Check if the given token is mUSD on any supported chain
 * mUSD has the same address on all chains
 */
const isMusdToken = (tokenAddress: Hex): boolean =>
  tokenAddress.toLowerCase() === MUSD_TOKEN_ADDRESS.toLowerCase();

/**
 * Get the chain IDs to fetch Merkl rewards from.
 * For mUSD, we fetch from both mainnet and Linea since users can earn
 * rewards by holding mUSD on either chain, but rewards are on Linea.
 */
const getChainIdsForRewardsFetch = (
  assetChainId: Hex,
  tokenAddress: Hex,
): Hex | Hex[] => {
  if (isMusdToken(tokenAddress)) {
    // For mUSD, fetch only Linea
    return [CHAIN_IDS.LINEA_MAINNET];
  }
  return [assetChainId];
};

/**
 * Fetch Merkl rewards for a given asset
 * Convenience wrapper that extracts necessary data from TokenI
 *
 * For mUSD tokens: fetches from both mainnet and Linea chains, and looks
 * for Linea mUSD rewards (since rewards are always claimed on Linea).
 *
 * @param asset - The token asset to fetch rewards for
 * @param userAddress - The user's wallet address
 * @param signal - Optional AbortSignal for cancelling the request
 * @param throwOnError - If true, throws on API errors. If false, returns null on errors (default: true)
 * @returns The matching reward data or null if not found or if error occurs (when throwOnError is false)
 */
export const fetchMerklRewardsForAsset = async (
  asset: TokenI,
  userAddress: string,
  signal?: AbortSignal,
  throwOnError = true,
): Promise<MerklRewardData['rewards'][0] | null> => {
  const tokenAddress = asset.address as Hex;
  const chainIds = getChainIdsForRewardsFetch(
    asset.chainId as Hex,
    tokenAddress,
  );

  // For mUSD, always search for MUSD_TOKEN_ADDRESS rewards
  // For other tokens, use the asset's address
  const rewardTokenAddress = isMusdToken(tokenAddress)
    ? MUSD_TOKEN_ADDRESS
    : tokenAddress;

  return fetchMerklRewards(
    {
      userAddress,
      chainIds,
      tokenAddress: rewardTokenAddress,
      signal,
    },
    throwOnError,
  );
};

/**
 * Read the claimed amount from the Merkl Distributor contract
 * This provides the most up-to-date claimed amount directly from the blockchain
 * @param userAddress - The user's wallet address
 * @param tokenAddress - The token address
 * @param chainId - The chain ID
 * @returns The claimed amount as a string (in base units/wei), or null if the call fails (allows fallback to API value)
 */
export const getClaimedAmountFromContract = async (
  userAddress: string,
  tokenAddress: Hex,
  chainId: Hex,
): Promise<string | null> => {
  try {
    const { NetworkController } = Engine.context;
    const networkClientId =
      NetworkController.findNetworkClientIdByChainId(chainId);

    if (!networkClientId) {
      return null;
    }

    const networkClient =
      NetworkController.getNetworkClientById(networkClientId);
    const ethQuery = new EthQuery(networkClient.provider);

    // Encode the claimed function call
    const contractInterface = new Interface(DISTRIBUTOR_CLAIMED_ABI);
    const data = contractInterface.encodeFunctionData('claimed', [
      userAddress,
      tokenAddress,
    ]);

    // Make the contract call with 'latest' block to ensure fresh data
    const res = await query(ethQuery, 'call', [
      {
        to: MERKL_DISTRIBUTOR_ADDRESS,
        data,
      },
      'latest',
    ]);

    // Decode the result - it's a struct with (amount, timestamp, merkleRoot)
    if (!res || res === '0x') {
      return null;
    }

    // Decode the struct response
    const decoded = contractInterface.decodeFunctionResult('claimed', res);
    // Extract the amount (first element of the struct)
    // decoded.amount if named, decoded[0] if positional
    const claimedAmount = decoded.amount ?? decoded[0];

    return claimedAmount.toString();
  } catch (error) {
    // Return null on error to allow fallback to API value
    return null;
  }
};
