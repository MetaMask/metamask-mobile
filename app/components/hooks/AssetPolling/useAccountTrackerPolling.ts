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
import { isPortfolioViewEnabled } from '../../../util/networks';
import { getNetworkConfigurationsToPoll } from './utils';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: { networkClientId: string }[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const currentChainId = useSelector(selectChainId);
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);

  const networkConfigurationsPopular = getNetworkConfigurationsToPoll(
    networkConfigurations,
    currentChainId,
    isAllNetworksSelected,
  );

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
