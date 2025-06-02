import { useTokensWithBalance } from './useTokensWithBalance';
import { Hex, CaipChainId } from '@metamask/utils';
import { useMemo } from 'react';
import { useTopTokens } from './useTopTokens';
import { BridgeToken } from '../types';

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
  tokensToExclude
}: UseTokensProps): { tokens: BridgeToken[], pending: boolean } {
  const tokensWithBalance = useTokensWithBalance({
    chainIds: balanceChainIds
  });

  const { topTokens, remainingTokens, pending } = useTopTokens({ chainId: topTokensChainId });

  const tokensWithoutBalance = useMemo(() => {
    const allTokens = [...(topTokens ?? []), ...(remainingTokens ?? [])];
    return allTokens.filter((token) => !tokensWithBalance.some(
      (t) => t.address === token.address && t.chainId === token.chainId
    ));
  }, [topTokens, remainingTokens, tokensWithBalance]);

  const uniqueTokens = useMemo(
    () => [...tokensWithBalance, ...tokensWithoutBalance],
    [tokensWithBalance, tokensWithoutBalance]
  );

  const filteredTokens = useMemo(
    () => uniqueTokens.filter((token) => {
      // filter out tokens that are in the tokensToExclude array
      const isSelectedToken = tokensToExclude?.some(
        (t) => t.address === token.address && t.chainId === token.chainId
      );
      return !isSelectedToken;
    }),
    [uniqueTokens, tokensToExclude]
  );

  return { tokens: filteredTokens, pending };
}
