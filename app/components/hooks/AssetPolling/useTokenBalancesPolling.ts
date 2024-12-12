import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import Engine from '../../../core/Engine';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectAllTokenBalances } from '../../../selectors/tokenBalancesController';
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

const useTokenBalancesPolling = ({ chainIds }: { chainIds?: Hex[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  // Selectors returning state updated by the polling
  const tokenBalances = useSelector(selectAllTokenBalances);

  // determine if the current chain is popular
  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  // filter out networks that are not popular, mainnet or linea mainnet
  const networkConfigurationsPopular: NetworkConfiguration[] = Object.values(
    networkConfigurations,
  ).reduce((acc: NetworkConfiguration[], network) => {
    if (
      isPopular ||
      network.chainId === CHAIN_IDS.MAINNET ||
      network.chainId === CHAIN_IDS.LINEA_MAINNET
    ) {
      acc.push(network);
    }
    return acc;
  }, []);

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll = isAllNetworksSelected
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
