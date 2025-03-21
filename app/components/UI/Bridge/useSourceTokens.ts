import { TokenIWithFiatAmount, useTokensWithBalance } from './useTokensWithBalance';
import { useSelector } from 'react-redux';
import { selectSelectedSourceChainIds } from '../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';

// TODO get top tokens from BridgeController
export const useSourceTokens: () => TokenIWithFiatAmount[] = () => {
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const tokensWithBalance = useTokensWithBalance({ chainIds: selectedSourceChainIds as Hex[] });

  return tokensWithBalance;
};
