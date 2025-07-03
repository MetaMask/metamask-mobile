import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../selectors/networkController';
import { useNetworkEnablement } from './useNetworkEnablement';
import { ProcessedNetwork } from './useNetworksByNamespace';

export type SelectionMode = 'single' | 'multi';

interface UseNetworkSelectionOptions {
  mode: SelectionMode;
  networks: ProcessedNetwork[];
  /**
   * For single mode: which networks to reset to when selecting
   * For multi mode: which networks to clear when selecting from this set
   */
  resetNetworkType?: 'popular' | 'custom';
}

/**
 * Hook that provides network selection functionality for both single and multi-selection modes
 */
export const useNetworkSelection = ({
  mode,
  networks,
  resetNetworkType,
}: UseNetworkSelectionOptions) => {
  const {
    namespace,
    enableNetwork,
    disableNetwork,
    toggleNetwork,
    enabledNetworksByNamespace,
  } = useNetworkEnablement();

  const popularNetworkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );

  const resetToPopularNetworks = useCallback(() => {
    const currentEnabledNetworks = enabledNetworksByNamespace[namespace];
    if (
      !currentEnabledNetworks ||
      Object.keys(currentEnabledNetworks).length === 0
    ) {
      return;
    }

    popularNetworkConfigurations.forEach((network) => {
      enableNetwork(network.caipChainId);
    });
  }, [
    popularNetworkConfigurations,
    enabledNetworksByNamespace,
    namespace,
    enableNetwork,
  ]);

  const resetCustomNetworks = useCallback(() => {
    const currentNetworksByNamespace = enabledNetworksByNamespace[namespace];

    const currentEnabledNetworks = Object.keys(currentNetworksByNamespace)
      .filter((key) => currentNetworksByNamespace[key])
      .map((key) => formatChainIdToCaip(key));

    const popularNetworks = popularNetworkConfigurations.map(
      (network) => network.caipChainId,
    );

    const networksToReset = currentEnabledNetworks.filter(
      (chainId) => !popularNetworks.includes(chainId),
    );

    if (networksToReset.length === 0) {
      return;
    }

    networksToReset.forEach((chainId) => {
      disableNetwork(chainId as CaipChainId);
    });
  }, [
    enabledNetworksByNamespace,
    namespace,
    popularNetworkConfigurations,
    disableNetwork,
  ]);

  const selectNetwork = useCallback(
    (chainId: CaipChainId) => {
      if (mode === 'single') {
        // Reset logic for single selection
        if (resetNetworkType === 'popular') {
          resetToPopularNetworks();
        } else if (resetNetworkType === 'custom') {
          resetCustomNetworks();
        }
        enableNetwork(chainId);
      } else {
        // Multi-selection mode - toggle the network
        if (resetNetworkType === 'custom') {
          resetCustomNetworks();
        }
        toggleNetwork(chainId);
      }
    },
    [
      mode,
      resetNetworkType,
      resetToPopularNetworks,
      resetCustomNetworks,
      enableNetwork,
      toggleNetwork,
    ],
  );

  const selectAll = useCallback(() => {
    if (mode !== 'multi') return;

    networks.forEach(({ caipChainId }) => {
      enableNetwork(caipChainId);
    });
  }, [mode, networks, enableNetwork]);

  const deselectAll = useCallback(() => {
    if (mode !== 'multi') return;
    networks.forEach(({ caipChainId }) => {
      disableNetwork(caipChainId);
    });
  }, [mode, networks, disableNetwork]);

  const toggleAll = useCallback(() => {
    if (mode !== 'multi') return;

    const areAllSelected = networks.every(({ isSelected }) => isSelected);
    if (areAllSelected) {
      deselectAll();
    } else {
      // First disable ALL networks, then enable only the ones we want
      const allEnabledNetworks = Object.keys(
        enabledNetworksByNamespace[namespace],
      )
        .filter((key) => enabledNetworksByNamespace[namespace][key])
        .map((key) => formatChainIdToCaip(key));

      // Disable all currently enabled networks
      allEnabledNetworks.forEach((chainId) => {
        disableNetwork(chainId as CaipChainId);
      });

      // Then enable only the networks we want
      networks.forEach(({ caipChainId }) => {
        enableNetwork(caipChainId);
      });
    }
  }, [
    mode,
    networks,
    deselectAll,
    enabledNetworksByNamespace,
    namespace,
    disableNetwork,
    enableNetwork,
  ]);

  return {
    selectNetwork,
    selectAll,
    deselectAll,
    toggleAll,
  };
};
