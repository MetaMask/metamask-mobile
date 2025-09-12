import { useSelector } from 'react-redux';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { useMemo } from 'react';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
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
    const portfolioViewEnabled = isPortfolioViewEnabled();
    const globalNetworkSelectorEnabled = isRemoveGlobalNetworkSelectorEnabled();
    const portfolioViewAllNetworksSelected =
      isAllNetworksSelected && isPopularNetwork;

    // Non EVM networks selected
    if (!isEvmSelected) {
      return [];
    }

    // Non-Portfolio View
    if (!portfolioViewEnabled) {
      return selectedNetworkConfig;
    }

    // Portfolio View and GNS
    if (portfolioViewEnabled && globalNetworkSelectorEnabled) {
      // Filtered all EVM networks
      return (enabledEvmNetworks || [])
        .map((network) => {
          const networkConfig = networkConfigurations[network];
          return networkConfig;
        })
        .filter((c) => Boolean(c));
    }

    // Portfolio View enabled with single network view
    if (portfolioViewEnabled && !portfolioViewAllNetworksSelected) {
      return selectedNetworkConfig;
    }

    // Portfolio View enabled with all networks
    if (portfolioViewEnabled && portfolioViewAllNetworksSelected) {
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
