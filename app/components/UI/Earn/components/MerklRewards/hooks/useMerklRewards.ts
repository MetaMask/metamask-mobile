import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../constants/musd';
import { AGLAMERKL_ADDRESS } from '../constants';
import {
  fetchMerklRewardsForAsset,
  getClaimedAmountFromContract,
} from '../merkl-client';

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

interface UseMerklRewardsOptions {
  asset: TokenI;
  exchangeRate?: number;
}

interface UseMerklRewardsReturn {
  claimableReward: string | null;
  refetch: () => Promise<void>;
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

  const fetchClaimableRewards = useCallback(
    async (abortController?: AbortController) => {
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

      const controller = abortController || new AbortController();

      try {
        // Use throwOnError=false to silently handle API errors
        const matchingReward = await fetchMerklRewardsForAsset(
          asset,
          selectedAddress,
          controller.signal,
          false, // Don't throw on error, return null instead
        );

        // Check if aborted after fetch (defensive check)
        if (controller.signal.aborted) {
          return;
        }

        if (!matchingReward) {
          return;
        }

        // Get the claimed amount from the contract instead of the API
        // The API's claimed value doesn't update immediately after claiming,
        // but the contract's claimed mapping is updated immediately
        // If the contract call fails, fall back to the API's claimed value
        const claimedFromContract = await getClaimedAmountFromContract(
          selectedAddress,
          asset.address as Hex,
          asset.chainId as Hex,
        );

        // Use contract value if available, otherwise fall back to API value
        const claimedAmount =
          claimedFromContract !== null
            ? claimedFromContract
            : matchingReward.claimed;

        // Use unclaimed amount as it represents claimable rewards in the Merkle tree
        // Use token decimals from API response, fallback to asset decimals
        // Convert string amounts to BigInt for subtraction, then back to string
        const unclaimedBaseUnits =
          BigInt(matchingReward.amount) - BigInt(claimedAmount);
        const tokenDecimals =
          matchingReward.token.decimals ?? asset.decimals ?? 18;

        if (unclaimedBaseUnits > 0n) {
          // Convert from wei to token amount
          const unclaimedAmount = renderFromTokenMinimalUnit(
            unclaimedBaseUnits.toString(),
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
            if (!controller.signal.aborted) {
              setClaimableReward(unclaimedAmount);
            }
          }
        } else if (!controller.signal.aborted) {
          // No claimable rewards left, set to null
          setClaimableReward(null);
        }
      } catch (error) {
        // Ignore AbortError - this is expected when effect is cleaned up
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // Silently handle other errors - component will show no rewards if fetch fails
      }
    },
    [asset, selectedAddress],
  );

  useEffect(() => {
    // Create AbortController to cancel fetch if effect is cleaned up
    const abortController = new AbortController();

    fetchClaimableRewards(abortController);

    // Cleanup function to abort fetch
    return () => {
      abortController.abort();
    };
  }, [fetchClaimableRewards]);

  const refetch = useCallback(async () => {
    await fetchClaimableRewards();
  }, [fetchClaimableRewards]);

  return {
    claimableReward,
    refetch,
  };
};
