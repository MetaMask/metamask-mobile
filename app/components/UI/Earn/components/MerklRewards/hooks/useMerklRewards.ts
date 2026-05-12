import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
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

const MUSD_ADDRESS = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET];
const MUSD_ADDRESS_MAINNET = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
const MERKL_REWARDS_AUTO_REFRESH_INTERVAL_MS = 60_000;

// Map of chains and eligible tokens
// mUSD on mainnet is eligible because users earn rewards for holding it,
// even though the actual reward claiming happens on Linea
export const eligibleTokens: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [AGLAMERKL_ADDRESS_MAINNET, MUSD_ADDRESS_MAINNET], // mUSD and test token
  [CHAIN_IDS.LINEA_MAINNET]: [AGLAMERKL_ADDRESS_LINEA, MUSD_ADDRESS], // mUSD and test token
  ['0xe709' as Hex]: [AGLAMERKL_ADDRESS_LINEA, MUSD_ADDRESS], // Linea fork
};

/**
 * Check if a token is eligible for Merkl rewards
 * Compares addresses case-insensitively since Ethereum addresses are case-insensitive
 * Returns false for native tokens (undefined/null address)
 */
export const isTokenEligibleForMerklRewards = (
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
  lifetimeBonusClaimed: string | null;
  hasClaimedBefore: boolean;
  refetch: () => void;
  rewardsFetchVersion: number;
}

/**
 * Custom hook to fetch and manage claimable Merkl rewards for AGLAMERKL token
 */
export const useMerklRewards = ({
  asset,
}: UseMerklRewardsOptions): UseMerklRewardsReturn => {
  const [claimableReward, setClaimableReward] = useState<string | null>(null);
  const [lifetimeBonusClaimed, setLifetimeBonusClaimed] = useState<
    string | null
  >(null);
  const [hasClaimedBefore, setHasClaimedBefore] = useState(false);
  const [rewardsFetchVersion, setRewardsFetchVersion] = useState(0);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const fetchClaimableRewards = useCallback(
    async (abortController?: AbortController) => {
      // Guard against undefined asset (can happen when selector returns undefined)
      if (!asset) {
        setClaimableReward(null);
        setLifetimeBonusClaimed(null);
        setHasClaimedBefore(false);
        return;
      }

      const isEligible = isTokenEligibleForMerklRewards(
        asset.chainId as Hex,
        asset.address as Hex | undefined,
      );

      if (!isEligible || !selectedAddress) {
        setClaimableReward(null);
        setLifetimeBonusClaimed(null);
        setHasClaimedBefore(false);
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
          setClaimableReward(null);
          setLifetimeBonusClaimed(null);
          setHasClaimedBefore(false);
          return;
        }

        // Get the claimed amount from the contract instead of the API
        // The API's claimed value doesn't update immediately after claiming,
        // but the contract's claimed mapping is updated immediately
        // If the contract call fails, fall back to the API's claimed value
        // For mUSD, we always check the Linea contract since that's where claims happen
        const claimChainId = CHAIN_IDS.LINEA_MAINNET as Hex;
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

        // Use token decimals from API response, fallback to asset decimals
        const tokenDecimals =
          matchingReward.token.decimals ?? asset.decimals ?? 18;

        if (!controller.signal.aborted) {
          setHasClaimedBefore(BigInt(claimedAmount) > 0n);

          // Compute lifetime bonus claimed as a human-readable dollar amount
          const claimedBigInt = BigInt(claimedAmount);
          if (claimedBigInt > 0n) {
            const claimedDecimal =
              Number(claimedBigInt) / Math.pow(10, tokenDecimals);
            setLifetimeBonusClaimed(claimedDecimal.toFixed(2));
          } else {
            setLifetimeBonusClaimed('0.00');
          }
        }

        // Use unclaimed amount as it represents claimable rewards in the Merkle tree
        // Convert string amounts to BigInt for subtraction, then back to string
        const unclaimedBaseUnits =
          BigInt(matchingReward.amount) - BigInt(claimedAmount);

        if (unclaimedBaseUnits > 0n) {
          const unclaimedDecimal =
            Number(unclaimedBaseUnits) / Math.pow(10, tokenDecimals);
          const displayAmount =
            unclaimedDecimal < 0.01 ? '< 0.01' : unclaimedDecimal.toFixed(2);
          if (displayAmount !== '0' && displayAmount !== '0.00') {
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
      } finally {
        if (!controller.signal.aborted) {
          setRewardsFetchVersion((version) => version + 1);
        }
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

  useEffect(() => {
    if (!asset || !selectedAddress) {
      return;
    }

    const intervalId = setInterval(() => {
      refetch();
    }, MERKL_REWARDS_AUTO_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [asset, selectedAddress, refetch]);

  return {
    claimableReward,
    lifetimeBonusClaimed,
    hasClaimedBefore,
    refetch,
    rewardsFetchVersion,
  };
};
