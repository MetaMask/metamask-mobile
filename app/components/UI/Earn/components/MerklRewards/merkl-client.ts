import { Hex } from '@metamask/utils';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Interface } from '@ethersproject/abi';
import Engine from '../../../../../core/Engine';
import { TokenI } from '../../../Tokens/types';
import {
  AGLAMERKL_ADDRESS,
  MERKL_API_BASE_URL,
  MERKL_DISTRIBUTOR_ADDRESS,
  DISTRIBUTOR_CLAIMED_ABI,
} from './constants';

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

  // Add test parameter for test token (case-insensitive comparison)
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

/**
 * Read the claimed amount from the Merkl Distributor contract
 * This provides the most up-to-date claimed amount directly from the blockchain
 * @param userAddress - The user's wallet address
 * @param tokenAddress - The token address
 * @param chainId - The chain ID
 * @returns The claimed amount as a string (in base units/wei), or '0' if not found or on error
 */
export const getClaimedAmountFromContract = async (
  userAddress: string,
  tokenAddress: Hex,
  chainId: Hex,
): Promise<string> => {
  try {
    const { NetworkController } = Engine.context;
    const networkClientId =
      NetworkController.findNetworkClientIdByChainId(chainId);

    if (!networkClientId) {
      return '0';
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

    // Make the contract call
    const res = await query(ethQuery, 'call', [
      {
        to: MERKL_DISTRIBUTOR_ADDRESS,
        data,
      },
    ]);

    // Decode the result - it's a struct with (amount, timestamp, merkleRoot)
    if (!res || res === '0x') {
      return '0';
    }

    // Decode the struct response
    const decoded = contractInterface.decodeFunctionResult('claimed', res);
    // Extract the amount (first element of the struct)
    // decoded.amount if named, decoded[0] if positional
    const claimedAmount = decoded.amount ?? decoded[0];

    return claimedAmount.toString();
  } catch (error) {
    // Silently return '0' on error to allow fallback to API value
    return '0';
  }
};
