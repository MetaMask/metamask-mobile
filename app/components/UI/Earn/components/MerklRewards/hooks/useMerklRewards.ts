import { useState, useEffect, useCallback, useRef } from 'react';
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
} from '../merkl-client';
import Logger from '../../../../../../util/Logger';
import Engine from '../../../../../../core/Engine';

const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];

// Map of chains and eligible tokens
export const eligibleTokens: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [AGLAMERKL_ADDRESS_MAINNET], // Testing
  [CHAIN_IDS.LINEA_MAINNET]: [AGLAMERKL_ADDRESS_LINEA, MUSD_ADDRESS], // Musd and AGLAMERKL
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
  /** True while processing a claim (after clearReward until confirmed) */
  isProcessingClaim: boolean;
  refetch: () => void;
  /** Optimistically clear the reward (for immediate UI update after successful claim) */
  clearReward: () => void;
  /** Refetch with retries until balance changes (for verifying claim success) */
  refetchWithRetry: (options?: {
    maxRetries?: number;
    delayMs?: number;
  }) => Promise<void>;
}

/**
 * Custom hook to fetch and manage claimable Merkl rewards for AGLAMERKL token
 */
export const useMerklRewards = ({
  asset,
}: UseMerklRewardsOptions): UseMerklRewardsReturn => {
  const [claimableReward, setClaimableReward] = useState<string | null>(null);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  // Track if a claim was just processed - prevents stale refetches from restoring the reward
  const claimProcessedRef = useRef(false);
  // Track if refetchWithRetry is in progress to prevent duplicate calls
  const retryInProgressRef = useRef(false);

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
          // If a claim was just processed, don't restore the reward
          // This prevents stale refetches from showing the reward again
          if (claimProcessedRef.current) {
            return;
          }

          // Convert from wei to token amount
          const unclaimedAmount = renderFromTokenMinimalUnit(
            unclaimedBaseUnits.toString(),
            tokenDecimals,
            2, // Show 2 decimal places
          );
          // Handle the "< 0.00001" case from renderFromTokenMinimalUnit
          // by showing "< 0.01" for consistency with 2 decimal places
          const displayAmount = unclaimedAmount.startsWith('<')
            ? '< 0.01'
            : unclaimedAmount;
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
          // No claimable rewards left - claim was successful!
          // Clear the claim processed flag since we've confirmed the claim
          claimProcessedRef.current = false;
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

  // refetch can be called externally to refresh data (e.g., after claiming)
  const refetch = useCallback(() => {
    fetchClaimableRewards();
  }, [fetchClaimableRewards]);

  // Optimistically clear reward for immediate UI update
  const clearReward = useCallback(() => {
    // Set flag to prevent stale refetches from restoring the reward
    claimProcessedRef.current = true;
    setIsProcessingClaim(true);
    setClaimableReward(null);
  }, []);

  // Trigger token balance refresh via TokenBalancesController and AccountTrackerController
  const refreshTokenBalances = useCallback(async () => {
    if (!asset) {
      return;
    }

    try {
      const {
        TokenBalancesController,
        AccountTrackerController,
        NetworkController,
      } = Engine.context;

      const chainId = asset.chainId as Hex;

      // Get networkClientId for the chain
      const networkConfig =
        NetworkController?.state?.networkConfigurationsByChainId?.[chainId];
      const networkClientId =
        networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex]
          ?.networkClientId;

      // Refresh token balances and account balances in parallel
      await Promise.all([
        TokenBalancesController?.updateBalances({
          chainIds: [chainId],
        }),
        networkClientId
          ? AccountTrackerController?.refresh([networkClientId])
          : Promise.resolve(),
      ]);
    } catch (error) {
      Logger.error(
        error as Error,
        'useMerklRewards: Failed to refresh token balances',
      );
    }
  }, [asset]);

  // Refetch with retries until balance changes (claimable becomes null/0)
  const refetchWithRetry = useCallback(
    async (options?: { maxRetries?: number; delayMs?: number }) => {
      // Prevent duplicate retry calls
      if (retryInProgressRef.current) {
        return;
      }

      retryInProgressRef.current = true;
      const maxRetries = options?.maxRetries ?? 5;
      const delayMs = options?.delayMs ?? 3000;

      try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          // Wait before each attempt (including first) to give blockchain time to update
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          await fetchClaimableRewards();

          // If claim flag was cleared, the fetch confirmed the claim succeeded
          if (!claimProcessedRef.current) {
            // Trigger token balance refresh since we received new tokens
            await refreshTokenBalances();
            break;
          }
        }
      } finally {
        retryInProgressRef.current = false;
        // Clear the claim flag after retries complete
        // If still set, the blockchain might not have updated - that's ok, section stays hidden
        claimProcessedRef.current = false;
        setIsProcessingClaim(false);
      }
    },
    [fetchClaimableRewards, refreshTokenBalances],
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

  return {
    claimableReward,
    isProcessingClaim,
    refetch,
    clearReward,
    refetchWithRetry,
  };
};
