import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkConfigurations,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';
import { isPortfolioViewEnabled } from '../../../util/networks';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: { networkClientId: string }[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

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
      network.chainId === CHAIN_IDS.LINEA_MAINNET ||
      isAllNetworksSelected
    ) {
      acc.push(network);
    }
    return acc;
  }, []);

  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const accountsByChainId = useSelector(selectAccountsByChainId);
  const networkClientIdsConfig = networkConfigurationsPopular.map(
    (network) => ({
      networkClientId:
        network?.rpcEndpoints?.[network?.defaultRpcEndpointIndex]
          ?.networkClientId,
    }),
  );

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll = isAllNetworksSelected
    ? networkClientIdsConfig
    : [{ networkClientId: selectedNetworkClientId }];

  const chainIdsToPoll = isPortfolioViewEnabled()
    ? networkClientIds ?? networkConfigurationsToPoll
    : [{ networkClientId: selectedNetworkClientId }];

  const { AccountTrackerController } = Engine.context;

  usePolling({
    startPolling: AccountTrackerController.startPolling.bind(
      AccountTrackerController,
    ),
    stopPollingByPollingToken:
      AccountTrackerController.stopPollingByPollingToken.bind(
        AccountTrackerController,
      ),
    input: chainIdsToPoll,
  });

  return {
    accountsByChainId,
  };
};

export default useAccountTrackerPolling;
