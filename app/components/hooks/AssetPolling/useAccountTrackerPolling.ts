import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { PopularList } from '../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: { networkClientId: string }[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  const chainsConfigToPoll: NetworkConfiguration[] = Object.values(
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

  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const accountsByChainId = useSelector(selectAccountsByChainId);
  const networkClientIdsConfig = chainsConfigToPoll.map((network) => ({
    networkClientId:
      network?.rpcEndpoints?.[network?.defaultRpcEndpointIndex]
        ?.networkClientId,
  }));

  const chainIdsToPoll =
    isPortfolioViewEnabled() && isPopular
      ? networkClientIds ?? networkClientIdsConfig
      : [
          {
            networkClientId: selectedNetworkClientId,
          },
        ];

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
