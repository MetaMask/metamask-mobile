import { TokenIWithFiatAmount, useTokensWithBalance } from './useTokensWithBalance';
import { useSelector } from 'react-redux';
import { selectSelectedSourceChainIds, selectDestToken } from '../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';

// TODO get top tokens from BridgeController
export const useSourceTokens: () => TokenIWithFiatAmount[] = () => {
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const selectedDestToken = useSelector(selectDestToken);

  const tokensWithBalance = useTokensWithBalance({ chainIds: selectedSourceChainIds as Hex[] });

  return tokensWithBalance.filter((token) => !(token.address === selectedDestToken?.address
    && token.chainId === selectedDestToken?.chainId));
};
