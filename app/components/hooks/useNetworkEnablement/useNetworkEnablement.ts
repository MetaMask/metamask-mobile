import { useCallback, useMemo } from 'react';
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

// Stable empty-array fallback shared by all three popular-network lists, so an
// empty result keeps a constant identity across renders. Typed `never[]`
// (the bottom array type) so it's assignable to each list's element type
// without widening the consumer-visible array types.
const EMPTY_ARRAY: never[] = [];

/**
 * Manages network enablement state across namespaces (EVM, Bitcoin, etc).
 * Provides methods to enable, disable, toggle, and conditionally enable networks.
 *
 * @returns Network enablement methods and state
 * Exposes popularEvmNetworks, popularMultichainNetworks, and popularNetworks (arrays)
 * from the controller for use in polling, token lists, etc.
 *
 * @example
 * ```tsx
 * const {
 *   enableNetwork,
 *   tryEnableEvmNetwork,
 *   isNetworkEnabled,
 *   popularEvmNetworks,
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
 * const evmChainIds = popularEvmNetworks;
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

  // The popular-network lists are derived from the configured networks (the
  // controller filters POPULAR_NETWORKS by NetworkController /
  // MultichainNetworkController state), so key them on the network
  // configurations as well as the controller instance — this avoids both a
  // fresh array on every render and serving a stale list when configs change.
  // `selectNetworkConfigurations` is a deep-equal selector covering both EVM
  // and non-EVM configs, so it only changes when the configs actually change.
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const [
    popularEvmNetworksList,
    popularMultichainNetworksList,
    popularNetworksList,
  ] = useMemo(
    () => [
      networkEnablementController?.listPopularEvmNetworks?.() ?? EMPTY_ARRAY,
      networkEnablementController?.listPopularMultichainNetworks?.() ??
        EMPTY_ARRAY,
      networkEnablementController?.listPopularNetworks?.() ?? EMPTY_ARRAY,
    ],
    // `networkConfigurations` is not referenced directly, but the controller
    // methods above read that state internally, so it must invalidate the memo.
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
      networkEnablementController.enableNetwork(chainId);
    },
    [networkEnablementController],
  );

  const enableAllPopularNetworks = useMemo(
    () => () => {
      networkEnablementController.enableAllPopularNetworks();
    },
    [networkEnablementController],
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

  // Memoize the returned object so consumers (this hook is used in ~22 files,
  // many feeding it into useMemo/useEffect deps) get a stable identity.
  return useMemo(
    () => ({
      namespace,
      enabledNetworksByNamespace,
      enabledNetworksForCurrentNamespace,
      enabledNetworksForAllNamespaces,
      networkEnablementController,
      enableNetwork,
      disableNetwork,
      enableAllPopularNetworks,
      popularEvmNetworks: popularEvmNetworksList,
      popularMultichainNetworks: popularMultichainNetworksList,
      popularNetworks: popularNetworksList,
      isNetworkEnabled,
      hasOneEnabledNetwork,
      tryEnableEvmNetwork,
    }),
    [
      namespace,
      enabledNetworksByNamespace,
      enabledNetworksForCurrentNamespace,
      enabledNetworksForAllNamespaces,
      networkEnablementController,
      enableNetwork,
      disableNetwork,
      enableAllPopularNetworks,
      popularEvmNetworksList,
      popularMultichainNetworksList,
      popularNetworksList,
      isNetworkEnabled,
      hasOneEnabledNetwork,
      tryEnableEvmNetwork,
    ],
  );
};
