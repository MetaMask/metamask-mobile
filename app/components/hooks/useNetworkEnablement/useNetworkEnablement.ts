import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  parseCaipChainId,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
} from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';

/**
 * Manages network enablement state across namespaces (EVM, Bitcoin, etc).
 * Provides methods to enable, disable, and select all popular networks.
 * @returns Network enablement methods and state
 * @example
 *
 * const { enableNetwork, toggleNetwork } = useNetworkEnablement();
 * enableNetwork('eip155:1'); // Enable Ethereum mainnet
 * enablePopularNetworks(); // Enable all popular networks
 * disableNetwork('eip155:137'); // Disable Polygon
 * isNetworkEnabled('eip155:137'); // Check if Polygon is enabled
 * hasOneEnabledNetwork(); // Check if there is at least one enabled network
 *
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
  };
};
