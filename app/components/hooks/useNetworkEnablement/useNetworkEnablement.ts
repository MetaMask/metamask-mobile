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
import { selectChainId } from '../../../selectors/networkController';

/**
 * Manages network enablement state across namespaces (EVM, Bitcoin, etc).
 * Provides methods to enable, disable, toggle, and conditionally enable networks.
 *
 * @returns Network enablement methods and state
 * @example
 * ```tsx
 * const {
 *   enableNetwork,
 *   tryEnableEvmNetwork,
 *   isNetworkEnabled
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

  const enabledNetworksForCurrentNamespace = useMemo(
    () => enabledNetworksByNamespace?.[namespace] || {},
    [enabledNetworksByNamespace, namespace],
  );

  const enableNetwork = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.enableNetwork(chainId),
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

  return {
    namespace,
    enabledNetworksByNamespace,
    enabledNetworksForCurrentNamespace,
    networkEnablementController,
    enableNetwork,
    disableNetwork,
    enableAllPopularNetworks,
    isNetworkEnabled,
    hasOneEnabledNetwork,
    tryEnableEvmNetwork,
  };
};
