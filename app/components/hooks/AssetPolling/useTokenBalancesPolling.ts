import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);

  // Selectors returning state updated by the polling
  const tokenBalances = useSelector(selectAllTokenBalances);

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? Object.keys(networkConfigurations)
    : [currentChainId];

  const { TokenBalancesController } = Engine.context;

  usePolling({
    startPolling: TokenBalancesController.startPolling.bind(
      TokenBalancesController,
    ),
    stopPollingByPollingToken:
      TokenBalancesController.stopPollingByPollingToken.bind(
        TokenBalancesController,
      ),
    input: chainIdsToPoll.map((chainId) => ({ chainId: chainId as Hex })),
  });

  return {
    tokenBalances,
  };
};

export default useTokenBalancesPolling;
