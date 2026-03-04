import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  parseCaipChainId,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
  toCaipChainId,
  isHexString,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';

/**
 * Manages network enablement state across namespaces (EVM, Bitcoin, etc).
 * Provides methods to enable, disable, toggle, and conditionally enable networks.
 *
 * @returns Network enablement methods and state
 * Exposes listPopularEvmNetworks, listPopularMultichainNetworks, and listPopularNetworks
 * from the controller for use in polling, token lists, etc.
 *
 * @example
 * ```tsx
 * const {
 *   enableNetwork,
 *   tryEnableEvmNetwork,
 *   isNetworkEnabled,
 *   listPopularEvmNetworks,
 * } = useNetworkEnablement();
 *
 * // Direct network operations
 * enableNetwork('eip155:1'); // Enable Ethereum mainnet
 *
 * // Conditional enablement for transactions/swaps
 * tryEnableEvmNetwork('0x1'); // Enable if global selector is enabled and network is disabled
 *
 * // Check network status
 * const isEnabled = isNetworkEnabled('eip155:1');
 *
 * // Popular networks (restricted to configured networks)
 * const evmChainIds = listPopularEvmNetworks();
 * ```
 */
export const useNetworkEnablement = () => {
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );

  const currentChainId = useSelector(selectChainId);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const currentCaipChainId = isEvmSelected
    ? (toEvmCaipChainId(currentChainId as Hex) as CaipChainId)
    : (currentChainId as CaipChainId);
  const { namespace } = parseCaipChainId(currentCaipChainId);
  const networkEnablementController = useMemo(
    () => Engine.context.NetworkEnablementController,
    [],
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Memoize list results so callers get stable array references when the list hasn't changed.
  // Re-run when network config changes so the list reflects add/remove network.
  const popularEvmNetworksList = useMemo(
    () => networkEnablementController.listPopularEvmNetworks(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkEnablementController, networkConfigurations],
  );
  const popularMultichainNetworksList = useMemo(
    () => networkEnablementController.listPopularMultichainNetworks(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkEnablementController, networkConfigurations],
  );
  const popularNetworksList = useMemo(
    () => networkEnablementController.listPopularNetworks(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [networkEnablementController, networkConfigurations],
  );

  const enabledNetworksForCurrentNamespace = useMemo(
    () => enabledNetworksByNamespace?.[namespace] || {},
    [enabledNetworksByNamespace, namespace],
  );

  const enabledNetworksForAllNamespaces = useMemo(
    () =>
      enabledNetworksByNamespace
        ? Object.values(enabledNetworksByNamespace).reduce(
            (acc, obj) => ({ ...acc, ...obj }),
            {},
          )
        : {},
    [enabledNetworksByNamespace],
  );

  const enableNetwork = useMemo(
    () => (chainId: CaipChainId) => {
      if (isMultichainAccountsState2Enabled) {
        networkEnablementController.enableNetwork(chainId);
        return;
      }
      networkEnablementController.enableNetworkInNamespace(chainId, namespace);
    },
    [networkEnablementController, isMultichainAccountsState2Enabled, namespace],
  );

  const enableAllPopularNetworks = useMemo(
    () => () => {
      networkEnablementController.enableAllPopularNetworks();
    },
    [networkEnablementController],
  );

  const listPopularEvmNetworks = useCallback(
    () => popularEvmNetworksList,
    [popularEvmNetworksList],
  );

  const listPopularMultichainNetworks = useCallback(
    () => popularMultichainNetworksList,
    [popularMultichainNetworksList],
  );

  const listPopularNetworks = useCallback(
    () => popularNetworksList,
    [popularNetworksList],
  );

  const hasOneEnabledNetwork = useMemo(
    () =>
      Object.values(enabledNetworksForCurrentNamespace).filter(Boolean)
        .length === 1,
    [enabledNetworksForCurrentNamespace],
  );

  const disableNetwork = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.disableNetwork(chainId),
    [networkEnablementController],
  );

  const isNetworkEnabled = useMemo(
    () => (chainId: CaipChainId) => {
      const { namespace: chainNamespace, reference } =
        parseCaipChainId(chainId);
      // For EVM networks (eip155), use hex format. For non-EVM, use full CAIP chain ID
      const formattedChainId =
        chainNamespace === KnownCaipNamespace.Eip155
          ? toHex(reference)
          : chainId;
      return (
        enabledNetworksByNamespace?.[chainNamespace]?.[formattedChainId] ===
        true
      );
    },
    [enabledNetworksByNamespace],
  );

  const tryEnableEvmNetwork = useCallback(
    (chainId?: string) => {
      if (chainId && isHexString(chainId)) {
        const caipChainId = toCaipChainId(KnownCaipNamespace.Eip155, chainId);
        const isEnabled = isNetworkEnabled(caipChainId);
        if (!isEnabled) {
          enableNetwork(caipChainId);
        }
      }
    },
    [isNetworkEnabled, enableNetwork],
  );

  return {
    namespace,
    enabledNetworksByNamespace,
    enabledNetworksForCurrentNamespace,
    enabledNetworksForAllNamespaces,
    networkEnablementController,
    enableNetwork,
    disableNetwork,
    enableAllPopularNetworks,
    listPopularEvmNetworks,
    listPopularMultichainNetworks,
    listPopularNetworks,
    isNetworkEnabled,
    hasOneEnabledNetwork,
    tryEnableEvmNetwork,
  };
};
