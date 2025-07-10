import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../selectors/networkController';
import { useNetworkEnablement } from './useNetworkEnablement';
import { ProcessedNetwork } from './useNetworksByNamespace';

export enum SelectionMode {
  Single = 'single',
  Multi = 'multi',
}

export enum ResetNetworkType {
  Popular = 'popular',
  Custom = 'custom',
}

interface UseNetworkSelectionOptions {
  mode: SelectionMode;
  networks: ProcessedNetwork[];
  /**
   * For single mode: which networks to reset to when selecting
   * For multi mode: which networks to clear when selecting from this set
   */
  resetNetworkType?: ResetNetworkType;
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
    networkEnablementController,
  } = useNetworkEnablement();

  const popularNetworkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );

  const popularNetworkChainIds = useMemo(
    () =>
      new Set(
        popularNetworkConfigurations.map((network) => network.caipChainId),
      ),
    [popularNetworkConfigurations],
  );

  const currentEnabledNetworks = useMemo(
    () =>
      Object.keys(enabledNetworksByNamespace[namespace] || {})
        .filter((key) => enabledNetworksByNamespace[namespace][key])
        .map((key) => formatChainIdToCaip(key)),
    [enabledNetworksByNamespace, namespace],
  );

  const customNetworksToReset = useMemo(
    () =>
      currentEnabledNetworks.filter(
        (chainId) => !popularNetworkChainIds.has(chainId),
      ),
    [currentEnabledNetworks, popularNetworkChainIds],
  );

  const resetToPopularNetworks = useCallback(() => {
    const enabledNetworksForNamespace = enabledNetworksByNamespace[namespace];
    if (
      !enabledNetworksForNamespace ||
      Object.keys(enabledNetworksForNamespace).length === 0
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

  const resetCustomNetworks = useCallback(
    (excludeChainId?: CaipChainId) => {
      const networksToDisable = excludeChainId
        ? customNetworksToReset.filter((chainId) => chainId !== excludeChainId)
        : customNetworksToReset;

      if (networksToDisable.length === 0) {
        return;
      }

      networksToDisable.forEach((chainId) => {
        disableNetwork(chainId as CaipChainId);
      });
    },
    [customNetworksToReset, disableNetwork],
  );

  const selectNetwork = useCallback(
    (chainId: CaipChainId) => {
      if (mode === SelectionMode.Single) {
        if (resetNetworkType === ResetNetworkType.Popular) {
          resetToPopularNetworks();
        } else if (resetNetworkType === ResetNetworkType.Custom) {
          // Enable the target network first to ensure at least one network is always enabled
          enableNetwork(chainId);
          // Then disable custom networks, excluding the newly enabled one
          resetCustomNetworks(chainId);
        } else {
          // If no reset type specified, just enable the target network
          enableNetwork(chainId);
        }

        // For popular reset type, enable the target network after resetting
        if (resetNetworkType === ResetNetworkType.Popular) {
          enableNetwork(chainId);
        }
      } else if (resetNetworkType === ResetNetworkType.Custom) {
        const isCurrentlyEnabled =
          networkEnablementController.isNetworkEnabled(chainId);
        if (!isCurrentlyEnabled) {
          // Enable the target network first
          enableNetwork(chainId);
          // Then reset custom networks, excluding the newly enabled one
          resetCustomNetworks(chainId);
        } else {
          // If already enabled, just toggle it (which might disable it)
          toggleNetwork(chainId);
        }
      } else {
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
      networkEnablementController,
    ],
  );

  const selectAll = useCallback(() => {
    if (mode !== SelectionMode.Multi) return;

    networks.forEach(({ caipChainId, isSelected }) => {
      if (!isSelected) {
        selectNetwork(caipChainId);
      }
    });
  }, [mode, networks, selectNetwork]);

  const deselectAll = useCallback(() => {
    if (mode !== SelectionMode.Multi) return;

    networks.forEach(({ caipChainId }) => {
      disableNetwork(caipChainId);
    });
  }, [mode, networks, disableNetwork]);

  const toggleAll = useCallback(() => {
    if (mode !== SelectionMode.Multi) return;
    const areAllSelected = networks.every(({ isSelected }) => isSelected);
    if (areAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [mode, networks, deselectAll, selectAll]);

  return {
    selectNetwork,
    selectAll,
    deselectAll,
    toggleAll,
  };
};
