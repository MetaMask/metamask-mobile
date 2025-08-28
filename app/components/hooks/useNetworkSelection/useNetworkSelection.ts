import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';

interface UseNetworkSelectionOptions {
  /**
   * Array of processed networks that can be selected/deselected
   */
  networks: ProcessedNetwork[];
}

/**
 * Manages network selection state with support for popular and custom networks.
 * Key behaviors:
 * - Popular networks can be multi-selected
 * - Custom networks are exclusive (only one at a time)
 * - At least one network is always enabled (defaults to Ethereum mainnet)
 * @param options.networks - Array of networks to manage
 * @returns Network selection methods and state
 * @example
 * ```tsx
 * const { selectNetwork, selectAllPopularNetworks } = useNetworkSelection({ networks });
 *
 * // Select with callback
 * selectNetwork('0x1', () => navigation.goBack());
 *
 * // Select without callback
 * selectNetwork('0x1');
 *
 * // Select all popular networks with callback
 * selectAllPopularNetworks(() => navigation.goBack());
 * ```
 */
export const useNetworkSelection = ({
  networks,
}: UseNetworkSelectionOptions) => {
  const {
    namespace,
    enableNetwork,
    disableNetwork,
    enabledNetworksByNamespace,
    enableAllPopularNetworks,
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
        .filter((key) => enabledNetworksByNamespace[namespace][key as Hex])
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

  /** Disables all custom networks except the optionally specified one */
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

  /** Selects a custom network exclusively (disables other custom networks) */
  const selectCustomNetwork = useCallback(
    (chainId: CaipChainId, onComplete?: () => void) => {
      enableNetwork(chainId);
      resetCustomNetworks(chainId);
      onComplete?.();
    },
    [enableNetwork, resetCustomNetworks],
  );

  const selectAllPopularNetworks = useCallback(
    (onComplete?: () => void) => {
      enableAllPopularNetworks();
      resetCustomNetworks();
      onComplete?.();
    },
    [enableAllPopularNetworks, resetCustomNetworks],
  );

  /** Toggles a popular network and resets all custom networks */
  const selectPopularNetwork = useCallback(
    (chainId: CaipChainId, onComplete?: () => void) => {
      enableNetwork(chainId);
      resetCustomNetworks();
      onComplete?.();
    },
    [enableNetwork, resetCustomNetworks],
  );

  /** Selects a network, automatically handling popular vs custom logic */
  const selectNetwork = useCallback(
    (
      hexOrCaipChainId: CaipChainId | `0x${string}` | Hex,
      onComplete?: () => void,
    ) => {
      const inputString = String(hexOrCaipChainId);
      const hexChainId = (
        typeof hexOrCaipChainId === 'string' && inputString.includes(':')
          ? toHex(inputString.split(':')[1])
          : toHex(hexOrCaipChainId)
      ) as `0x${string}`;

      const isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(hexChainId);
      const caipChainId = formatChainIdToCaip(hexOrCaipChainId);
      if (isPopularNetwork) {
        selectPopularNetwork(caipChainId, onComplete);
      } else {
        selectCustomNetwork(caipChainId, onComplete);
      }
    },
    [selectPopularNetwork, selectCustomNetwork],
  );

  /** Deselects all networks except Ethereum mainnet */
  const deselectAll = useCallback(() => {
    networks.forEach(({ caipChainId }) => {
      if (caipChainId !== 'eip155:1') {
        disableNetwork(caipChainId);
      }
    });
  }, [networks, disableNetwork]);

  return {
    selectCustomNetwork,
    selectPopularNetwork,
    selectNetwork,
    deselectAll,
    resetCustomNetworks,
    customNetworksToReset,
    selectAllPopularNetworks,
  };
};
