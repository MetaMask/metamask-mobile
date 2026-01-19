import { Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import { AGLAMERKL_ADDRESS, MERKL_API_BASE_URL } from './constants';

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

/**
 * Options for fetching Merkl rewards
 */
export interface FetchMerklRewardsOptions {
  userAddress: string;
  chainId: Hex;
  tokenAddress: Hex;
  signal?: AbortSignal;
}

/**
 * Build the Merkl API URL for fetching rewards
 */
const buildRewardsUrl = (
  userAddress: string,
  chainId: Hex,
  tokenAddress: Hex,
): string => {
  let url = `${MERKL_API_BASE_URL}/users/${userAddress}/rewards?chainId=${Number(chainId)}`;

  // Add test parameter for test token
  // Use case-insensitive comparison to match isEligibleForMerklRewards behavior
  if (tokenAddress.toLowerCase() === AGLAMERKL_ADDRESS.toLowerCase()) {
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
 * @param options - Fetch options including user address, chain ID, and token address
 * @param options.throwOnError - If true, throws on API errors. If false, returns null on errors (default: true)
 * @returns The matching reward data or null if not found or if error occurs (when throwOnError is false)
 * @throws Error if the API request fails and throwOnError is true
 */
export const fetchMerklRewards = async (
  { userAddress, chainId, tokenAddress, signal }: FetchMerklRewardsOptions,
  throwOnError = true,
): Promise<MerklRewardData['rewards'][0] | null> => {
  const url = buildRewardsUrl(userAddress, chainId, tokenAddress);

  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    if (throwOnError) {
      throw new Error(`Failed to fetch Merkl rewards: ${response.status}`);
    }
    return null;
  }

  const data: MerklRewardData[] = await response.json();

  return findMatchingReward(data, tokenAddress);
};

/**
 * Fetch Merkl rewards for a given asset
 * Convenience wrapper that extracts necessary data from TokenI
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
): Promise<MerklRewardData['rewards'][0] | null> =>
  fetchMerklRewards(
    {
      userAddress,
      chainId: asset.chainId as Hex,
      tokenAddress: asset.address as Hex,
      signal,
    },
    throwOnError,
  );
