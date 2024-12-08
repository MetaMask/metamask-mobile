import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectNetworkConfigurations,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: { networkClientId: string }[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const accountsByChainId = useSelector(selectAccountsByChainId);
  const networkClientIdsConfig = Object.values(networkConfigurations).map(
    (network) => ({
      networkClientId:
        network?.rpcEndpoints?.[network?.defaultRpcEndpointIndex]
          ?.networkClientId,
    }),
  );

  const chainIdsToPoll = isPortfolioViewEnabled()
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
