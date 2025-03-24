import { useTokensWithBalance, TokenIWithFiatAmount } from './useTokensWithBalance';
import { useSelector } from 'react-redux';
import { selectSelectedDestChainId, selectSourceToken } from '../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';

// TODO get top tokens from BridgeController
export const useDestinationTokens: () => TokenIWithFiatAmount[] = () => {
  const selectedDestChainId = useSelector(selectSelectedDestChainId);
  const selectedSourceToken = useSelector(selectSourceToken);

  const tokensWithBalance = useTokensWithBalance({ chainIds: [selectedDestChainId as Hex] });

  return tokensWithBalance.filter((token) => !(token.address === selectedSourceToken?.address
    && token.chainId === selectedSourceToken?.chainId));
};
