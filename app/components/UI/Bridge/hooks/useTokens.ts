import { useTokensWithBalance } from './useTokensWithBalance';
import { Hex, CaipChainId } from '@metamask/utils';
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

  const getTokenKey = (token: { address: string; chainId: Hex | CaipChainId }) => `${token.address}-${token.chainId}`;

  // Create Sets for O(1) lookups
  const tokensWithBalanceSet = new Set(
    tokensWithBalance.map(token => getTokenKey(token))
  );
  const excludedTokensSet = new Set(
    tokensToExclude?.map(token => getTokenKey(token)) ?? []
  );

  // Combine and filter tokens in a single pass
  const tokensWithoutBalance = (topTokens ?? []).concat(remainingTokens ?? []).filter(token => {
    const tokenKey = getTokenKey(token);
    return !tokensWithBalanceSet.has(tokenKey);
  });

  // Combine tokens with balance and filtered tokens and filter out excluded tokens
  const tokens = tokensWithBalance.concat(tokensWithoutBalance).filter(token => {
    const tokenKey = getTokenKey(token);
    return !excludedTokensSet.has(tokenKey);
  });

  return { tokens, pending };
}
