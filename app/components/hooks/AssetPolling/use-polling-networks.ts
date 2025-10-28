import { useSelector } from 'react-redux';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { useMemo } from 'react';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import {
  selectAllPopularNetworkConfigurations,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

export function usePollingNetworks() {
  const networkConfigurationsPopularNetworks = useSelector(
    selectAllPopularNetworkConfigurations,
  );
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const isAllNetworksSelected = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const enabledEvmNetworks = useSelector(selectEVMEnabledNetworks);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const selectedNetworkConfig = useMemo(() => {
    try {
      return [
        Object.values(networkConfigurations).find(
          (c) =>
            c?.rpcEndpoints?.[c?.defaultRpcEndpointIndex]?.networkClientId ===
            selectedNetworkClientId,
        ),
      ].filter((c): c is NonNullable<typeof c> => Boolean(c));
    } catch {
      return [];
    }
  }, [networkConfigurations, selectedNetworkClientId]);

  const networkConfigs: NetworkConfiguration[] = useMemo(() => {
    const globalNetworkSelectorEnabled = isRemoveGlobalNetworkSelectorEnabled();
    const portfolioViewAllNetworksSelected =
      isAllNetworksSelected && isPopularNetwork;

    // Non EVM networks selected
    if (!isEvmSelected) {
      return [];
    }

    // GNS
    if (globalNetworkSelectorEnabled) {
      // Filtered all EVM networks
      return (enabledEvmNetworks || [])
        .map((network) => {
          const networkConfig = networkConfigurations[network];
          return networkConfig;
        })
        .filter((c) => Boolean(c));
    }

    // Enabled with single network view
    if (!portfolioViewAllNetworksSelected) {
      return selectedNetworkConfig;
    }

    // Enabled with all networks
    if (portfolioViewAllNetworksSelected) {
      return Object.values(networkConfigurationsPopularNetworks);
    }

    // No polling
    return [];
  }, [
    enabledEvmNetworks,
    isAllNetworksSelected,
    isEvmSelected,
    isPopularNetwork,
    networkConfigurationsPopularNetworks,
    selectedNetworkConfig,
    networkConfigurations,
  ]);

  return networkConfigs;
}
