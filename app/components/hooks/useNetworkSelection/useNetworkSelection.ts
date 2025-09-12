import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';
///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
import { selectInternalAccounts } from '../../../selectors/accountsController';
///: END:ONLY_INCLUDE_IF
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
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

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const internalAccounts = useSelector(selectInternalAccounts);
  ///: END:ONLY_INCLUDE_IF

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

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const bitcoinInternalAccounts = useMemo(
    () =>
      internalAccounts.filter((account) =>
        account.type.includes(KnownCaipNamespace.Bip122),
      ),
    [internalAccounts],
  );
  ///: END:ONLY_INCLUDE_IF

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

  const resetSolanaNetworks = useCallback(() => {
    disableNetwork(SolScope.Mainnet);
  }, [disableNetwork]);

  const resetEvmNetworks = useCallback(() => {
    networks.forEach(({ caipChainId }) => {
      if (caipChainId !== SolScope.Mainnet) {
        disableNetwork(caipChainId);
      }
    });
  }, [networks, disableNetwork]);

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
          // TOOD: Icannot cancel or go back from the add account screen
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
      await enableNetwork(chainId);
      await resetCustomNetworks(chainId);
      if (isMultichainAccountsState2Enabled) {
        const { reference } = parseCaipChainId(chainId);
        const clientId = NetworkController.findNetworkClientIdByChainId(
          toHex(reference),
        );
        await MultichainNetworkController.setActiveNetwork(clientId);
        await resetSolanaNetworks();
      }
      onComplete?.();
    },
    [
      enableNetwork,
      resetCustomNetworks,
      resetSolanaNetworks,
      MultichainNetworkController,
      isMultichainAccountsState2Enabled,
      NetworkController,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      bitcoinInternalAccounts,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const selectAllPopularNetworks = useCallback(
    async (onComplete?: () => void) => {
      await enableAllPopularNetworks();
      await resetCustomNetworks();
      onComplete?.();
    },
    [enableAllPopularNetworks, resetCustomNetworks],
  );

  /** Toggles a popular network and resets all custom networks */
  const selectPopularNetwork = useCallback(
    async (chainId: CaipChainId, onComplete?: () => void) => {
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      if (chainId.includes(KnownCaipNamespace.Bip122)) {
        const bitcoAccountInScope = bitcoinInternalAccounts.find((account) =>
          account.scopes.includes(chainId),
        );

        if (bitcoAccountInScope) {
          Engine.setSelectedAddress(bitcoAccountInScope.address);
        }
      }
      ///: END:ONLY_INCLUDE_IF

      await enableNetwork(chainId);
      await resetCustomNetworks();
      if (isMultichainAccountsState2Enabled && chainId === SolScope.Mainnet) {
        try {
          await MultichainNetworkController.setActiveNetwork(chainId);
        } catch (error) {
          // Handle error silently for now
        }
        await resetEvmNetworks();
      }
      if (isMultichainAccountsState2Enabled && chainId !== SolScope.Mainnet) {
        const { reference } = parseCaipChainId(chainId);
        const clientId = NetworkController.findNetworkClientIdByChainId(
          toHex(reference),
        );
        await MultichainNetworkController.setActiveNetwork(clientId);
        await resetSolanaNetworks();
      }
      onComplete?.();
    },
    [
      enableNetwork,
      resetCustomNetworks,
      resetSolanaNetworks,
      isMultichainAccountsState2Enabled,
      resetEvmNetworks,
      MultichainNetworkController,
      NetworkController,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      bitcoinInternalAccounts,
      ///: END:ONLY_INCLUDE_IF
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
    resetCustomNetworks,
    customNetworksToReset,
    selectAllPopularNetworks,
  };
};
