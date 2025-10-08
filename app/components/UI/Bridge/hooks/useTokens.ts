import { useTokensWithBalance } from './useTokensWithBalance';
import { Hex, CaipChainId } from '@metamask/utils';
import { useTopTokens } from './useTopTokens';
import { BridgeToken } from '../types';
import {
  formatAddressToAssetId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

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

  const getTokenKey = (token: {
    address: string;
    chainId: Hex | CaipChainId;
  }) => {
    // Use the shared utility for non-EVM normalization to ensure consistent deduplication
    const normalizedAddress = isNonEvmChainId(token.chainId)
      ? formatAddressToAssetId(token.address, token.chainId)
      : token.address.toLowerCase();

    if (!normalizedAddress) {
      throw new Error(
        `Invalid token address: ${token.address} for chain ID: ${token.chainId}`,
      );
    }

    return `${normalizedAddress}-${token.chainId}`;
  };

  // Create Sets for O(1) lookups
  const tokensWithBalanceSet = new Set(
    tokensWithBalance.map((token) => getTokenKey(token)),
  );
  const excludedTokensSet = new Set(
    tokensToExclude?.map((token) => getTokenKey(token)) ?? [],
  );

  // Combine and filter tokens in a single pass
  const tokensWithoutBalance = (topTokens ?? [])
    .concat(remainingTokens ?? [])
    .filter((token) => {
      const tokenKey = getTokenKey(token);
      return !tokensWithBalanceSet.has(tokenKey);
    });

  // Combine tokens with balance and filtered tokens and filter out excluded tokens
  const allTokens = tokensWithBalance
    .concat(tokensWithoutBalance)
    .filter((token) => {
      const tokenKey = getTokenKey(token);
      return !excludedTokensSet.has(tokenKey);
    });

  const tokensToRender = tokensWithBalance
    .concat(
      topTokens?.filter((token) => {
        const tokenKey = getTokenKey(token);
        return !tokensWithBalanceSet.has(tokenKey);
      }) ?? [],
    )
    .filter((token) => {
      const tokenKey = getTokenKey(token);
      return !excludedTokensSet.has(tokenKey);
    });

  return { allTokens, tokensToRender, pending };
}
