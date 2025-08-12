import { useSelector } from 'react-redux';
import usePolling from '../usePolling';
import {
  selectAllPopularNetworkConfigurations,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import Engine from '../../../core/Engine';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';

// Polls native currency prices across networks.
const useAccountTrackerPolling = ({
  networkClientIds,
}: { networkClientIds?: string[] } = {}) => {
  // Selectors to determine polling input
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);

  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const networkClientIdsConfig = Object.values(
    networkConfigurationsPopularNetworks,
  )
    .map((network) => ({
      networkClientId:
        network?.rpcEndpoints?.[network?.defaultRpcEndpointIndex]
          ?.networkClientId,
    }))
    .filter((config) => config.networkClientId);

  let networkConfigurationsToPoll: { networkClientId: string }[] = [];

  if (isPortfolioViewEnabled()) {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      // When global network selector is removed, use enabled EVM networks
      networkConfigurationsToPoll = (enabledEvmNetworks || [])
        .map((network) => {
          const currentNetworkConfig =
            networkConfigurationsPopularNetworks[network];
          const defaultRpcEndpointIndex =
            currentNetworkConfig?.defaultRpcEndpointIndex;

          return {
            networkClientId:
              currentNetworkConfig?.rpcEndpoints?.[defaultRpcEndpointIndex]
                ?.networkClientId,
          };
        })
        .filter((config) => config.networkClientId);
    } else {
      networkConfigurationsToPoll =
        isAllNetworksSelected && isPopularNetwork
          ? networkClientIdsConfig
          : selectedNetworkClientId
          ? [{ networkClientId: selectedNetworkClientId }]
          : [];
    }
  } else {
    networkConfigurationsToPoll = selectedNetworkClientId
      ? [{ networkClientId: selectedNetworkClientId }]
      : [];
  }

  const chainIdsToPoll = isEvmSelected
    ? networkConfigurationsToPoll.map((network) => ({
        networkClientIds: [network.networkClientId],
      }))
    : [];

  let providedNetworkClientIds;
  if (networkClientIds) {
    providedNetworkClientIds = networkClientIds.map((networkClientId) => ({
      networkClientIds: [networkClientId],
    }));
  }

  const { AccountTrackerController } = Engine.context;

  const input = providedNetworkClientIds ?? chainIdsToPoll;

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
