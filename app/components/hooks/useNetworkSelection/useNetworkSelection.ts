import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../core/Engine';

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

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const { MultichainNetworkController, NetworkController } = Engine.context;

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

  /** Selects a custom network exclusively (disables other custom networks) */
  const selectCustomNetwork = useCallback(
    async (chainId: CaipChainId, onComplete?: () => void) => {
      await enableNetwork(chainId);
      if (isMultichainAccountsState2Enabled) {
        const { reference } = parseCaipChainId(chainId);
        const clientId = NetworkController.findNetworkClientIdByChainId(
          toHex(reference),
        );
        await MultichainNetworkController.setActiveNetwork(clientId);
      }
      onComplete?.();
    },
    [
      enableNetwork,
      MultichainNetworkController,
      isMultichainAccountsState2Enabled,
      NetworkController,
    ],
  );

  const selectAllPopularNetworks = useCallback(
    async (onComplete?: () => void) => {
      await enableAllPopularNetworks();
      onComplete?.();
    },
    [enableAllPopularNetworks],
  );

  /** Toggles a popular network and resets all custom networks */
  const selectPopularNetwork = useCallback(
    async (chainId: CaipChainId, onComplete?: () => void) => {
      await enableNetwork(chainId);
      if (isMultichainAccountsState2Enabled && chainId === SolScope.Mainnet) {
        try {
          await MultichainNetworkController.setActiveNetwork(chainId);
        } catch (error) {
          // Handle error silently for now
        }
      }
      if (isMultichainAccountsState2Enabled && chainId !== SolScope.Mainnet) {
        const { reference } = parseCaipChainId(chainId);
        const clientId = NetworkController.findNetworkClientIdByChainId(
          toHex(reference),
        );
        await MultichainNetworkController.setActiveNetwork(clientId);
      }
      onComplete?.();
    },
    [
      enableNetwork,
      isMultichainAccountsState2Enabled,
      MultichainNetworkController,
      NetworkController,
    ],
  );

  /** Selects a network, automatically handling popular vs custom logic */
  const selectNetwork = useCallback(
    (
      hexOrCaipChainId: CaipChainId | `0x${string}` | Hex,
      onComplete?: () => void,
    ) => {
      const chainIdString = String(hexOrCaipChainId);

      let isPopularNetwork = false;
      let caipChainId: CaipChainId;

      try {
        // Handle different input formats
        if (isCaipChainId(chainIdString)) {
          // Already in CAIP format
          caipChainId = chainIdString;

          // Parse the CAIP chain ID to get namespace and reference
          const { namespace: caipNamespace, reference } =
            parseCaipChainId(caipChainId);

          // For EVM networks, check if it's popular
          if (caipNamespace === 'eip155') {
            const hexChainId = toHex(reference);
            isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(hexChainId);
          }
          // For non-EVM networks (like Solana), treat as popular by default
          // since they don't have custom network support yet
          else {
            isPopularNetwork = true;
          }
        } else {
          // Convert hex chain ID to CAIP format
          caipChainId = formatChainIdToCaip(hexOrCaipChainId);
          const hexChainId = toHex(hexOrCaipChainId) as `0x${string}`;
          isPopularNetwork = POPULAR_NETWORK_CHAIN_IDS.has(hexChainId);
        }
      } catch (error) {
        console.error('selectNetwork: Error processing chain ID:', error);
        // Fallback: try to format as CAIP and treat as custom
        try {
          caipChainId = formatChainIdToCaip(hexOrCaipChainId);
          isPopularNetwork = false;
        } catch (fallbackError) {
          console.error(
            'selectNetwork: Fallback formatting failed:',
            fallbackError,
          );
          return; // Exit early if we can't process the chain ID
        }
      }

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
    customNetworksToReset,
    selectAllPopularNetworks,
  };
};
