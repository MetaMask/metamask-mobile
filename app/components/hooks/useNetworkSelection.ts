import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../selectors/networkController';
import { useNetworkEnablement } from './useNetworkEnablement';
import { ProcessedNetwork } from './useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../constants/network';

interface UseNetworkSelectionOptions {
  networks: ProcessedNetwork[];
}

/**
 * Hook that provides network selection functionality for both custom and popular networks
 */
export const useNetworkSelection = ({
  networks,
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

  // The network enablement controller will always have one network enabled
  // so we need to reset the custom networks to ensure that the network enablement controller
  // has at least one network enabled
  const selectCustomNetwork = useCallback(
    (chainId: CaipChainId) => {
      enableNetwork(chainId);
      resetCustomNetworks(chainId);
    },
    [enableNetwork, resetCustomNetworks],
  );

  const selectPopularNetwork = useCallback(
    (chainId: CaipChainId) => {
      // Toggle the popular network
      toggleNetwork(chainId);
      // Reset custom networks when selecting popular networks
      resetCustomNetworks();
    },
    [toggleNetwork, resetCustomNetworks],
  );

  const selectNetwork = useCallback(
    (hexOrCaipChainId: CaipChainId | `0x${string}` | Hex) => {
      const chainId = toHex(hexOrCaipChainId);
      const isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(
        chainId as `0x${string}`,
      );
      const caipChainId = formatChainIdToCaip(hexOrCaipChainId);
      if (isPopularNetwork) {
        selectPopularNetwork(caipChainId);
      } else {
        selectCustomNetwork(caipChainId);
      }
    },
    [selectPopularNetwork, selectCustomNetwork],
  );

  const deselectAll = useCallback(() => {
    networks.forEach(({ caipChainId }) => {
      // disable all networks except Ethereum. That should be the default network enabled
      // when all networks are deselected. The EnablementController will always have one network enabled
      if (caipChainId !== 'eip155:1') {
        disableNetwork(caipChainId);
      }
    });
  }, [networks, disableNetwork]);

  const toggleAll = useCallback(() => {
    const areAllSelected = networks.every(({ isSelected }) => isSelected);
    if (areAllSelected) {
      deselectAll();
    } else {
      // Select all popular networks
      networks.forEach(({ caipChainId }) => {
        enableNetwork(caipChainId);
      });
      resetCustomNetworks();
    }
  }, [networks, deselectAll, enableNetwork, resetCustomNetworks]);

  return {
    selectCustomNetwork,
    selectPopularNetwork,
    selectNetwork,
    deselectAll,
    toggleAll,
    resetCustomNetworks,
    customNetworksToReset,
  };
};
