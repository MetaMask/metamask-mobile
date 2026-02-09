import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../constants/musd';
import {
  AGLAMERKL_ADDRESS_MAINNET,
  AGLAMERKL_ADDRESS_LINEA,
} from '../constants';
import {
  fetchMerklRewardsForAsset,
  getClaimedAmountFromContract,
  getClaimChainId,
} from '../merkl-client';
import Logger from '../../../../../../util/Logger';

const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];
const MUSD_ADDRESS_MAINNET = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

// Map of chains and eligible tokens
// mUSD on mainnet is eligible because users earn rewards for holding it,
// even though the actual reward claiming happens on Linea
export const eligibleTokens: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [AGLAMERKL_ADDRESS_MAINNET, MUSD_ADDRESS_MAINNET], // mUSD and test token
  [CHAIN_IDS.LINEA_MAINNET]: [AGLAMERKL_ADDRESS_LINEA, MUSD_ADDRESS], // mUSD and test token
  ['0xe709' as Hex]: [AGLAMERKL_ADDRESS_LINEA], // Linea fork
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
  asset: TokenI | undefined;
}

interface UseMerklRewardsReturn {
  claimableReward: string | null;
  refetch: () => void;
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
      // Guard against undefined asset (can happen when selector returns undefined)
      if (!asset) {
        setClaimableReward(null);
        return;
      }

      const isEligible = isEligibleForMerklRewards(
        asset.chainId as Hex,
        asset.address as Hex | undefined,
      );

      if (!isEligible || !selectedAddress) {
        setClaimableReward(null);
        return;
      }

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
        // For mUSD, we always check the Linea contract since that's where claims happen
        const claimChainId = getClaimChainId(asset);
        const claimedFromContract = await getClaimedAmountFromContract(
          selectedAddress,
          matchingReward.token.address as Hex,
          claimChainId,
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
          // Handle the "< 0.00001" case from renderFromTokenMinimalUnit
          // by showing "< 0.01" for consistency with 2 decimal places
          // Also ensure we always show exactly 2 decimal places for currency display
          let displayAmount: string;
          if (unclaimedAmount.startsWith('<')) {
            displayAmount = '< 0.01';
          } else {
            // Ensure exactly 2 decimal places (e.g., "0.9" -> "0.90")
            const numValue = parseFloat(unclaimedAmount);
            displayAmount = numValue.toFixed(2);
          }
          // Double-check that the rendered amount is not '0' or '0.00'
          // This handles edge cases where very small amounts round to zero
          if (
            displayAmount &&
            displayAmount !== '0' &&
            displayAmount !== '0.00'
          ) {
            // Final check before setting state to ensure effect is still active
            if (!controller.signal.aborted) {
              setClaimableReward(displayAmount);
            }
          }
        } else if (!controller.signal.aborted) {
          // No claimable rewards left
          setClaimableReward(null);
        }
      } catch (error) {
        // Ignore AbortError - this is expected when effect is cleaned up
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        // Log other errors for debugging
        Logger.error(
          error as Error,
          'useMerklRewards: Error fetching claimable rewards',
        );
      }
    },
    [asset, selectedAddress],
  );

  // refetch can be called externally to refresh data
  const refetch = useCallback(() => {
    fetchClaimableRewards();
  }, [fetchClaimableRewards]);

  useEffect(() => {
    // Create AbortController to cancel fetch if effect is cleaned up
    const abortController = new AbortController();

    fetchClaimableRewards(abortController);

    // Cleanup function to abort fetch
    return () => {
      abortController.abort();
    };
  }, [fetchClaimableRewards]);

  return {
    claimableReward,
    refetch,
  };
};
