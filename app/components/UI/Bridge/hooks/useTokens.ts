import { useCallback, useMemo } from 'react';

import { useTokensWithBalance } from './useTokensWithBalance';
import { Hex, CaipChainId } from '@metamask/utils';
import { useTopTokens } from './useTopTokens';
import { BridgeToken } from '../types';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { zeroAddress } from 'ethereumjs-util';
import { POLYGON_NATIVE_TOKEN } from '../constants/assets';
import { isTradableToken } from '../utils/isTradableToken';

interface UseTokensProps {
  topTokensChainId?: Hex | CaipChainId;
  balanceChainIds?: (Hex | CaipChainId)[];
  tokensToExclude?: { address: string; chainId: Hex | CaipChainId }[];
}
/**
 * Hook to get tokens for the bridge
 * @param {Object} params - The parameters object
 * @param {Hex} params.topTokensChainId - The chain ID of the top tokens
 * @param {Hex[]} params.balanceChainIds - The chain IDs you want to get the balance for
 * @param {TokenI[]} params.tokensToExclude - The tokens to exclude
 * @returns {BridgeToken[]} Array of tokens with fiat balances
 */
export function useTokens({
  topTokensChainId,
  balanceChainIds,
  tokensToExclude,
}: UseTokensProps): {
  allTokens: BridgeToken[];
  tokensToRender: BridgeToken[];
  pending: boolean;
} {
  const tokensWithBalance = useTokensWithBalance({
    chainIds: balanceChainIds,
  });

  const { topTokens, remainingTokens, pending } = useTopTokens({
    chainId: topTokensChainId,
  });

  const getTokenKey = useCallback(
    (token: { address: string; chainId: Hex | CaipChainId }) => {
      // Use the shared utility for non-EVM normalization to ensure consistent deduplication
      let normalizedAddress = isNonEvmChainId(token.chainId)
        ? formatAddressToAssetId(token.address, token.chainId)
        : token.address.toLowerCase();

      if (!normalizedAddress) {
        throw new Error(
          `Invalid token address: ${token.address} for chain ID: ${token.chainId}`,
        );
      }

      // Normalize the native token address for Polygon
      // Prevents duplicate tokens with different addresses from
      // rendering in the UI
      if (normalizedAddress === POLYGON_NATIVE_TOKEN) {
        normalizedAddress = zeroAddress();
      }

      return `${normalizedAddress}-${token.chainId}`;
    },
    [],
  );

  // Create Sets for O(1) lookups
  const tokensWithBalanceSet = useMemo(
    () => new Set(tokensWithBalance.map((token) => getTokenKey(token))),
    [tokensWithBalance, getTokenKey],
  );
  const excludedTokensSet = useMemo(
    () => new Set(tokensToExclude?.map((token) => getTokenKey(token)) ?? []),
    [tokensToExclude, getTokenKey],
  );

  // Combine and filter tokens in a single pass
  const tokensWithoutBalance = useMemo(
    () =>
      (topTokens ?? []).concat(remainingTokens ?? []).filter((token) => {
        if (!isTradableToken(token)) {
          return false;
        }

        const tokenKey = getTokenKey(token);
        return !tokensWithBalanceSet.has(tokenKey);
      }),
    [topTokens, remainingTokens, getTokenKey, tokensWithBalanceSet],
  );

  // Combine tokens with balance and filtered tokens and filter out excluded tokens
  const allTokens = useMemo(
    () =>
      tokensWithBalance.concat(tokensWithoutBalance).filter((token) => {
        if (!isTradableToken(token)) {
          return false;
        }

        //TODO hack the metadata for ondo tokens only
        // if (token.aggregators.includes('Ondo')) {
        //   token.rwaData = {
        //     instrumentType: 'stock',
        //     ticker: token.name?.split(' ')[0] ?? '',
        //     market: {
        //       nextOpen: new Date(new Date().setHours(9, 0, 0, 0)),
        //       nextClose: new Date(new Date().setHours(16, 0, 0, 0)),
        //     },
        //     nextPause: {
        //       start: null,
        //       end: null,
        //     },
        //   } as BridgeToken['rwaData'];
        // }

        const tokenKey = getTokenKey(token);
        return !excludedTokensSet.has(tokenKey);
      }),
    [tokensWithBalance, tokensWithoutBalance, getTokenKey, excludedTokensSet],
  );

  const tokensToRender = useMemo(
    () =>
      tokensWithBalance
        .concat(
          topTokens?.filter((token) => {
            const tokenKey = getTokenKey(token);
            return !tokensWithBalanceSet.has(tokenKey);
          }) ?? [],
        )
        .filter((token) => {
          if (!isTradableToken(token)) {
            return false;
          }

          const tokenKey = getTokenKey(token);
          return !excludedTokensSet.has(tokenKey);
        }),
    [
      tokensWithBalance,
      topTokens,
      getTokenKey,
      tokensWithBalanceSet,
      excludedTokensSet,
    ],
  );

  return { allTokens, tokensToRender, pending };
}
