import { TokenIWithFiatAmount, useTokensWithBalance } from './useTokensWithBalance';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useTopTokens } from './useTopTokens';
import { BridgeAsset, formatChainIdToHex } from '@metamask/bridge-controller';
import { TokenI } from '../../Tokens/types';

interface UseTokensProps {
  topTokensChainId?: Hex;
  balanceChainIds?: Hex[];
  tokensToExclude?: TokenI[];
}

type BridgeAsset2 = Omit<BridgeAsset, 'chainId'> & {
  chainId: Hex;
};

/**
 * Hook to get tokens for the bridge
 * @param {Object} params - The parameters object
 * @param {Hex} params.topTokensChainId - The chain ID of the top tokens
 * @param {Hex[]} params.balanceChainIds - The chain IDs you want to get the balance for
 * @param {TokenI[]} params.tokensToExclude - The tokens to exclude
 * @returns {TokenIWithFiatAmount[]} Array of tokens with fiat balances
 */
export function useTokens({
  topTokensChainId,
  balanceChainIds,
  tokensToExclude
}: UseTokensProps): (TokenIWithFiatAmount | BridgeAsset2)[] {
  const tokensWithBalance = useTokensWithBalance({
    chainIds: balanceChainIds as Hex[]
  });

  const { topTokens } = useTopTokens({ chainId: topTokensChainId });

  const topTokensFiltered = useMemo(() =>
    Object.values(topTokens ?? {})
      .map((token) => ({
        ...token,
        chainId: formatChainIdToHex(token.chainId),
        image: token.iconUrl || token.icon,
      }))
      .filter((token) => !tokensWithBalance.some(
        (t) => t.address === token.address && t.chainId === token.chainId
      )),
    [topTokens, tokensWithBalance]
  );

  const uniqueTokens = useMemo(
    () => [...tokensWithBalance, ...topTokensFiltered],
    [tokensWithBalance, topTokensFiltered]
  );

  const filteredTokens = useMemo(
    () => uniqueTokens.filter((token) => {
      const isSelectedToken = tokensToExclude?.some(
        (t) => t.address === token.address && t.chainId === token.chainId
      );
      return !isSelectedToken;
    }),
    [uniqueTokens, tokensToExclude]
  );

  return filteredTokens;
}
