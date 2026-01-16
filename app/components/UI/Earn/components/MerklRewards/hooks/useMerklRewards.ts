import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../constants/musd';

const MERKL_API_BASE_URL = 'https://api.merkl.xyz/v4';
const AGLAMERKL_ADDRESS = '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898'; // Used for test campaigns
const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];

// Map of chains and eligible tokens
export const eligibleTokens: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [AGLAMERKL_ADDRESS], // Testing
  [CHAIN_IDS.LINEA_MAINNET]: [MUSD_ADDRESS], // Musd
};

/**
 * Check if a token is eligible for Merkl rewards
 * Compares addresses case-insensitively since Ethereum addresses are case-insensitive
 * Returns false for native tokens (undefined/null address)
 */
export const isEligibleForMerklRewards = (
  chainId: Hex,
  address: Hex | undefined | null,
): boolean => {
  // Native tokens (ETH, etc.) have undefined/null addresses and are not eligible
  if (!address) {
    return false;
  }
  const eligibleAddresses = eligibleTokens[chainId];
  if (!eligibleAddresses) {
    return false;
  }
  // Convert to lowercase for case-insensitive comparison
  const addressLower = address.toLowerCase();
  return eligibleAddresses.some(
    (eligibleAddress) => eligibleAddress.toLowerCase() === addressLower,
  );
};

interface MerklRewardData {
  rewards: {
    token: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      price: number | null;
    };
    accumulated: string;
    unclaimed: string;
    pending: string;
    proofs: string[];
    amount: string;
    claimed: string;
    recipient: string;
  }[];
}

interface UseMerklRewardsOptions {
  asset: TokenI;
  exchangeRate?: number;
}

interface UseMerklRewardsReturn {
  claimableReward: string | null;
}

/**
 * Custom hook to fetch and manage claimable Merkl rewards for AGLAMERKL token
 */
export const useMerklRewards = ({
  asset,
}: UseMerklRewardsOptions): UseMerklRewardsReturn => {
  const [claimableReward, setClaimableReward] = useState<string | null>(null);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  useEffect(() => {
    const isEligible = isEligibleForMerklRewards(
      asset.chainId as Hex,
      asset.address as Hex | undefined,
    );

    if (!isEligible || !selectedAddress) {
      setClaimableReward(null);
      return;
    }

    // Reset claimableReward when switching assets to prevent stale data
    setClaimableReward(null);

    // Create AbortController to cancel fetch if effect is cleaned up
    const abortController = new AbortController();

    const fetchClaimableRewards = async () => {
      try {
        // Convert hex chainId to decimal for API (e.g., '0x1' -> 1)
        const decimalChainId = Number(asset.chainId);
        const response = await fetch(
          `${MERKL_API_BASE_URL}/users/${selectedAddress}/rewards?chainId=${decimalChainId}&test=true`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const data: MerklRewardData[] = await response.json();

        // Check if aborted after JSON parsing (defensive check)
        if (abortController.signal.aborted) {
          return;
        }

        // Filter rewards to match the asset's token address (case-insensitive)
        // Search through all data array elements, not just data[0]
        const assetAddressLower = (asset.address as string).toLowerCase();
        let matchingReward = null;
        for (const dataEntry of data) {
          matchingReward = dataEntry?.rewards?.find(
            (reward) =>
              reward.token.address.toLowerCase() === assetAddressLower,
          );
          if (matchingReward) {
            break;
          }
        }

        if (!matchingReward) {
          return;
        }

        // Use unclaimed amount as it represents claimable rewards in the Merkle tree
        // Use token decimals from API response, fallback to asset decimals
        const unclaimedWei = matchingReward.unclaimed;
        const tokenDecimals =
          matchingReward.token.decimals ?? asset.decimals ?? 18;

        if (unclaimedWei && BigInt(unclaimedWei) > 0n) {
          // Convert from wei to token amount
          const unclaimedAmount = renderFromTokenMinimalUnit(
            unclaimedWei,
            tokenDecimals,
            2, // Show 2 decimal places
          );
          // Double-check that the rendered amount is not '0' or '0.00'
          // This handles edge cases where very small amounts round to zero
          if (
            unclaimedAmount &&
            unclaimedAmount !== '0' &&
            unclaimedAmount !== '0.00'
          ) {
            // Final check before setting state to ensure effect is still active
            if (!abortController.signal.aborted) {
              setClaimableReward(unclaimedAmount);
            }
          }
        }
      } catch (error) {
        // Ignore AbortError - this is expected when effect is cleaned up
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // Silently handle other errors - component will show no rewards if fetch fails
      }
    };

    fetchClaimableRewards();

    // Cleanup function to abort fetch
    return () => {
      abortController.abort();
    };
  }, [asset.address, asset.decimals, selectedAddress, asset.chainId]);

  return {
    claimableReward,
  };
};
