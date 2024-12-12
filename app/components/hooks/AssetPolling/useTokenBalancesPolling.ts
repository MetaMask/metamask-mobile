import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled, isTestNet } from '../../../util/networks';
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';
import { getNetworkConfigurationsToPoll } from './utils';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  // Selectors returning state updated by the polling
  const tokenBalances = useSelector(selectAllTokenBalances);

  const networkConfigurationsPopular = getNetworkConfigurationsToPoll(
    networkConfigurations,
    currentChainId,
    isAllNetworksSelected,
  );

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll =
    isAllNetworksSelected && !isTestNet(currentChainId)
      ? networkConfigurationsPopular
      : [{ chainId: currentChainId }];

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? chainIds ?? networkConfigurationsToPoll.map((network) => network.chainId)
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
