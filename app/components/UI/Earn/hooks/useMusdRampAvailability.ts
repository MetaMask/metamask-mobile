import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_BUYABLE_CHAIN_IDS,
} from '../constants/musd';
import { TokenI } from '../../Tokens/types';
import {
  getTokenBuyabilityKey,
  useTokensBuyability,
} from '../../Ramp/hooks/useTokenBuyability';

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
  const musdTokensByChain = useMemo(
    () =>
      MUSD_BUYABLE_CHAIN_IDS.map((chainId) => {
        const address = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
        if (!address) {
          return null;
        }

        const token: TokenI = {
          address,
          chainId,
          symbol: MUSD_TOKEN.symbol,
          name: MUSD_TOKEN.name,
          decimals: MUSD_TOKEN.decimals,
          image: '',
          logo: undefined,
          balance: '0',
          isETH: false,
          isNative: false,
        };
        return token;
      }),
    [],
  );

  const musdTokens = useMemo(
    () => musdTokensByChain.filter((token): token is TokenI => token !== null),
    [musdTokensByChain],
  );

  const { buyabilityByTokenKey } = useTokensBuyability(musdTokens);

  // Check if mUSD is buyable on a specific chain based on ramp availability
  const isMusdBuyableOnChain = useMemo(() => {
    const buyableByChain: Record<Hex, boolean> = {};
    MUSD_BUYABLE_CHAIN_IDS.forEach((chainId) => {
      buyableByChain[chainId] = false;
    });

    musdTokens.forEach((token) => {
      if (token.chainId) {
        const tokenKey = getTokenBuyabilityKey(token);
        buyableByChain[token.chainId as Hex] = Boolean(
          buyabilityByTokenKey[tokenKey],
        );
      }
    });

    return buyableByChain;
  }, [buyabilityByTokenKey, musdTokens]);

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
