import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex, KnownCaipNamespace } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectPopularNetworkConfigurationsByCaipChainId } from '../../../selectors/networkController';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';
import { ProcessedNetwork } from '../useNetworksByNamespace/useNetworksByNamespace';
import { POPULAR_NETWORK_CHAIN_IDS } from '../../../constants/popular-networks';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../../core/NavigationService';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
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
  ///: END:ONLY_INCLUDE_IF(bitcoin)

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
  ///: END:ONLY_INCLUDE_IF(bitcoin)

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
      ///: END:ONLY_INCLUDE_IF(bitcoin)
      await enableNetwork(chainId);
      await resetCustomNetworks(chainId);
      onComplete?.();
    },
    [enableNetwork, resetCustomNetworks, bitcoinInternalAccounts],
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
      ///: END:ONLY_INCLUDE_IF(bitcoin)

      await enableNetwork(chainId);
      await resetCustomNetworks();
      onComplete?.();
    },
    [enableNetwork, resetCustomNetworks, bitcoinInternalAccounts],
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
