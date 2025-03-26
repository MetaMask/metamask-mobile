import { TokenIWithFiatAmount, useTokensWithBalance } from './useTokensWithBalance';
import { useSelector } from 'react-redux';
import { selectSelectedSourceChainIds, selectDestToken } from '../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
import { useTopTokens } from './useTopTokens';
import { BridgeAsset, formatChainIdToHex } from '@metamask/bridge-controller';

interface UseSourceTokensProps {
  chainId?: Hex;
}

type BridgeAsset2 = Omit<BridgeAsset, 'chainId'> & { chainId: Hex };

export const useSourceTokens: ({ chainId }: UseSourceTokensProps) => (TokenIWithFiatAmount | BridgeAsset2)[] = ({ chainId }) => {
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const selectedDestToken = useSelector(selectDestToken);

  const tokensWithBalance = useTokensWithBalance({ chainIds: selectedSourceChainIds as Hex[] });
  const { topTokens } = useTopTokens({ chainId });
  const topTokensFiltered = useMemo(() => Object.values(topTokens ?? {})
    .map((token) => ({
      ...token,
      chainId: formatChainIdToHex(token.chainId),
      image: token.iconUrl || token.icon,
    }))
    .filter((token) => {
    // check if token is already in tokensWithBalance
    return !tokensWithBalance.some((t) => t.address === token.address && t.chainId === token.chainId);
  }), [topTokens, tokensWithBalance]);

  const uniqueTokens = useMemo(() => [...tokensWithBalance, ...topTokensFiltered], [tokensWithBalance, topTokensFiltered]);

  const filteredTokens = useMemo(() => uniqueTokens.filter((token) => {
    const isSelectedDestToken = token.address === selectedDestToken?.address && token.chainId === selectedDestToken?.chainId;

    return !isSelectedDestToken;
  }), [uniqueTokens, selectedDestToken]);

  return filteredTokens;
};
