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
 * Hook that provides network enablement functionality including:
 * - Current namespace from selected network
 * - Enabled networks by namespace
 * - Network enablement controller access
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
    () => enabledNetworksByNamespace[namespace] || {},
    [enabledNetworksByNamespace, namespace],
  );

  const enableNetwork = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.setEnabledNetwork(chainId),
    [networkEnablementController],
  );

  const disableNetwork = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.setDisabledNetwork(chainId),
    [networkEnablementController],
  );

  const toggleNetwork = useMemo(
    () => (chainId: CaipChainId) => {
      const controllerEnabled =
        networkEnablementController.isNetworkEnabled(chainId);
      const formattedChainId = parseCaipChainId(chainId).reference;
      const formattedChainIdHex = toHex(formattedChainId);
      const namespaceEnabled =
        enabledNetworksForCurrentNamespace[formattedChainIdHex] === true;

      if (controllerEnabled && namespaceEnabled) {
        disableNetwork(chainId);
      } else {
        enableNetwork(chainId);
      }
    },
    [
      networkEnablementController,
      enableNetwork,
      disableNetwork,
      enabledNetworksForCurrentNamespace,
    ],
  );

  const isNetworkEnabled = useMemo(
    () => (chainId: CaipChainId) =>
      networkEnablementController.isNetworkEnabled(chainId),
    [networkEnablementController],
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
