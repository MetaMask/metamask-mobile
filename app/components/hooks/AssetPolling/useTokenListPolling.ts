import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectChainIdsToPoll,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectERC20TokensByChain,
  selectTokenList,
} from '../../../selectors/tokenListController';

const useTokenListPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectChainIdsToPoll);
  const currentChainId = useSelector(selectChainId);

  // Selectors returning state updated by the polling
  const tokenList = useSelector(selectTokenList);
  const tokenListByChain = useSelector(selectERC20TokensByChain);

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? networkConfigurations
    : [currentChainId];

  const { TokenListController } = Engine.context;

  usePolling({
    startPolling: TokenListController.startPolling.bind(TokenListController),
    stopPollingByPollingToken:
      TokenListController.stopPollingByPollingToken.bind(TokenListController),
    input: chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex })),
  });

  return {
    tokenList,
    tokenListByChain,
  };
};

export default useTokenListPolling;
