import { TokenIWithFiatAmount, useTokensWithBalance } from './useTokensWithBalance';
import { useSelector } from 'react-redux';
import { selectSelectedSourceChainIds, selectDestToken } from '../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import { useMemo } from 'react';
// TODO get top tokens from BridgeController
export const useSourceTokens: () => TokenIWithFiatAmount[] = () => {
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const selectedDestToken = useSelector(selectDestToken);

  const tokensWithBalance = useTokensWithBalance({ chainIds: selectedSourceChainIds as Hex[] });

  const filteredTokens = useMemo(() => tokensWithBalance.filter((token) => {
    const isSelectedDestToken = token.address === selectedDestToken?.address && token.chainId === selectedDestToken?.chainId;

    return !isSelectedDestToken;
  }), [tokensWithBalance, selectedDestToken]);

  return filteredTokens;
};
