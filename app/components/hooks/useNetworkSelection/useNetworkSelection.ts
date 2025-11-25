import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  KnownCaipNamespace,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';
import Engine from '../../../core/Engine';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
import { selectInternalAccounts } from '../../../selectors/accountsController';
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
///: END:ONLY_INCLUDE_IF

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

  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const internalAccounts = useSelector(selectInternalAccounts);
  ///: END:ONLY_INCLUDE_IF

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

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const bitcoinInternalAccounts = useMemo(
    () =>
      internalAccounts.filter((account) =>
        account.type.includes(KnownCaipNamespace.Bip122),
      ),
    [internalAccounts],
  );
  ///: END:ONLY_INCLUDE_IF

  /**
   * Helper function to switch the active network in MultichainNetworkController.
   * This synchronizes the active network state when a network is enabled.
   * For EVM networks, it uses the networkClientId from rpcEndpoints.
   * For non-EVM networks (like Solana), it uses the caipChainId directly.
   */
  const switchActiveNetwork = useCallback(
    async (caipChainId: CaipChainId) => {
      const { MultichainNetworkController } = Engine.context;

      // For non-EVM chains (e.g., Solana, Bitcoin), use the caipChainId directly
      if (isNonEvmChainId(caipChainId)) {
        await MultichainNetworkController.setActiveNetwork(caipChainId);
        return;
      }

      // For EVM chains, use the networkClientId from rpcEndpoints
      const networkConfig = networkConfigurations[caipChainId];
      if (!networkConfig || !('rpcEndpoints' in networkConfig)) {
        // Configuration is missing or lacks RPC endpoints
        return;
      }

      const { rpcEndpoints, defaultRpcEndpointIndex } = networkConfig;
      const { networkClientId } = rpcEndpoints[defaultRpcEndpointIndex];

      await MultichainNetworkController.setActiveNetwork(networkClientId);
    },
    [networkConfigurations],
  );

  /** Selects a custom network exclusively (disables other custom networks) */
  const selectCustomNetwork = useCallback(
    async (chainId: CaipChainId, onComplete?: () => void) => {
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      const bitcoAccountInScope = bitcoinInternalAccounts.find((account) =>
        account.scopes.includes(chainId),
      );

      if (chainId.includes(KnownCaipNamespace.Bip122)) {
        // if the network is bitcoin and there is no bitcoin account in the scope
        // create a new bitcoin account (Bitcoin accounts are different per network)
        if (!bitcoAccountInScope) {
          // TODO: I cannot cancel or go back from the add account screen
          NavigationService.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.ADD_ACCOUNT,
            params: {
              clientType: WalletClientType.Bitcoin,
              scope: chainId,
            },
          });

          return;
        }
        // if the network is bitcoin and there is a bitcoin account in the scope
        // set the selected address to the bitcoin account
        Engine.setSelectedAddress(bitcoAccountInScope.address);
      }
      ///: END:ONLY_INCLUDE_IF

      // Enable the network in NetworkEnablementController
      await enableNetwork(chainId);

      // Switch the active network in MultichainNetworkController
      await switchActiveNetwork(chainId);

      onComplete?.();
    },
    [
      enableNetwork,
      switchActiveNetwork,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      bitcoinInternalAccounts,
      ///: END:ONLY_INCLUDE_IF(bitcoin)
    ],
  );

  const selectAllPopularNetworks = useCallback(
    async (onComplete?: () => void) => {
      await enableAllPopularNetworks();

      // Switch the active network in MultichainNetworkController to ethereum mainnet
      await switchActiveNetwork('eip155:1');

      onComplete?.();
    },
    [enableAllPopularNetworks, switchActiveNetwork],
  );

  /** Toggles a popular network and resets all custom networks */
  const selectPopularNetwork = useCallback(
    async (chainId: CaipChainId, onComplete?: () => void) => {
      // Enable the network in NetworkEnablementController
      await enableNetwork(chainId);

      // Switch the active network in MultichainNetworkController
      await switchActiveNetwork(chainId);

      onComplete?.();
    },
    [enableNetwork, switchActiveNetwork],
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
