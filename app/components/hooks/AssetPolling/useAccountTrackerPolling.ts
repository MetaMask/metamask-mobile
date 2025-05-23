import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectAllPopularNetworkConfigurations,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: { networkClientId: string }[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const networkClientIdsConfig = Object.values(
    networkConfigurationsPopularNetworks,
  ).map((network) => ({
    networkClientId:
      network?.rpcEndpoints?.[network?.defaultRpcEndpointIndex]
        ?.networkClientId,
  }));

  // if all networks are selected, poll all popular networks
  const networkConfigurationsToPoll =
    isAllNetworksSelected && isPopularNetwork && isPortfolioViewEnabled()
      ? networkClientIdsConfig
      : [{ networkClientId: selectedNetworkClientId }];

  const chainIdsToPoll = networkClientIds ?? networkConfigurationsToPoll;

  const { AccountTrackerController } = Engine.context;

  const input = isEvmSelected
    ? chainIdsToPoll.map((chainId) => ({
        networkClientIds: [chainId.networkClientId],
      }))
    : [];

  usePolling({
    startPolling: AccountTrackerController.startPolling.bind(
      AccountTrackerController,
    ),
    stopPollingByPollingToken:
      AccountTrackerController.stopPollingByPollingToken.bind(
        AccountTrackerController,
      ),
    input,
  });
};

export default useAccountTrackerPolling;
