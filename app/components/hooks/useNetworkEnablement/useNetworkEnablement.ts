import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { parseCaipChainId, CaipChainId, Hex } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../core/Engine';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../selectors/networkController';

/**
 * Manages network enablement state across namespaces (EVM, Bitcoin, etc).
 * Provides methods to enable, disable, and toggle networks.
 * @returns Network enablement methods and state
 * @example
 *
 * const { enableNetwork, toggleNetwork } = useNetworkEnablement();
 * enableNetwork('eip155:1'); // Enable Ethereum mainnet
 * toggleNetwork('eip155:137'); // Toggle Polygon
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

  const disableNetwork = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.disableNetwork(chainId),
    [networkEnablementController],
  );

  const isNetworkEnabled = useMemo(
    () => (chainId: CaipChainId) => {
      const { namespace: chainNamespace, reference } =
        parseCaipChainId(chainId);
      const formattedChainIdHex = toHex(reference);
      return (
        enabledNetworksByNamespace?.[chainNamespace]?.[formattedChainIdHex] ===
        true
      );
    },
    [enabledNetworksByNamespace],
  );

  const toggleNetwork = useMemo(
    () => (chainId: CaipChainId) => {
      const networkEnabled = isNetworkEnabled(chainId);

      if (networkEnabled) {
        disableNetwork(chainId);
      } else {
        enableNetwork(chainId);
      }
    },
    [isNetworkEnabled, enableNetwork, disableNetwork],
  );

  return {
    namespace,
    enabledNetworksByNamespace,
    enabledNetworksForCurrentNamespace,
    networkEnablementController,
    enableNetwork,
    disableNetwork,
    toggleNetwork,
    isNetworkEnabled,
  };
};
