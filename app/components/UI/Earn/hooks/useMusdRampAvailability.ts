import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import {
  MUSD_BUYABLE_CHAIN_IDS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../constants/musd';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import { toLowerCaseEquals } from '../../../../util/general';

export interface MusdRampAvailability {
  isMusdBuyableOnChain: Record<Hex, boolean>;
  isMusdBuyableOnAnyChain: boolean;
  getIsMusdBuyable: (
    selectedChainId: Hex | null,
    isPopularNetworksFilterActive: boolean,
  ) => boolean;
}

/**
 * Hook for mUSD Ramp availability logic.
 *
 * Determines whether mUSD is buyable through Ramp based on:
 * - Per-chain availability from Ramp token list
 * - Token support status for each chain
 *
 * @returns {MusdRampAvailability} Ramp availability state and helpers
 */
export const useMusdRampAvailability = (): MusdRampAvailability => {
  const { allTokens } = useRampTokens();

  // Check if mUSD is buyable on a specific chain based on ramp availability
  const isMusdBuyableOnChain = useMemo(() => {
    if (!allTokens) {
      return {};
    }

    const buyableByChain: Record<Hex, boolean> = {};

    MUSD_BUYABLE_CHAIN_IDS.forEach((chainId) => {
      const musdAssetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId];
      if (!musdAssetId) {
        buyableByChain[chainId] = false;
        return;
      }

      const musdToken = allTokens.find(
        (token) =>
          toLowerCaseEquals(token.assetId, musdAssetId) &&
          token.tokenSupported === true,
      );

      buyableByChain[chainId] = Boolean(musdToken);
    });

    return buyableByChain;
  }, [allTokens]);

  // Check if mUSD is buyable on any chain (for "all networks" view)
  const isMusdBuyableOnAnyChain = useMemo(
    () => Object.values(isMusdBuyableOnChain).some(Boolean),
    [isMusdBuyableOnChain],
  );

  // Context-aware buyability check based on network selection state
  const getIsMusdBuyable = useCallback(
    (
      selectedChainId: Hex | null,
      isPopularNetworksFilterActive: boolean,
    ): boolean => {
      // If popular networks filter active → check if buyable on any chain
      if (isPopularNetworksFilterActive) {
        return isMusdBuyableOnAnyChain;
      }

      // If single chain selected → check if buyable on that specific chain
      if (selectedChainId) {
        return isMusdBuyableOnChain[selectedChainId] ?? false;
      }

      // No networks selected or unknown state
      return false;
    },
    [isMusdBuyableOnChain, isMusdBuyableOnAnyChain],
  );

  return {
    isMusdBuyableOnChain,
    isMusdBuyableOnAnyChain,
    getIsMusdBuyable,
  };
};
