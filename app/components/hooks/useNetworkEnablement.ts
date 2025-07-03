import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { parseCaipChainId, CaipChainId } from '@metamask/utils';
import Engine from '../../core/Engine';
import { selectEnabledNetworksByNamespace } from '../../selectors/networkEnablementController';
import { selectedSelectedMultichainNetworkChainId } from '../../selectors/multichainNetworkController';

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

  const currentCaipChainId = useSelector(
    selectedSelectedMultichainNetworkChainId,
  );

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
      const isEnabled = networkEnablementController.isNetworkEnabled(chainId);
      if (isEnabled) {
        disableNetwork(chainId);
      } else {
        enableNetwork(chainId);
      }
    },
    [networkEnablementController, enableNetwork, disableNetwork],
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
