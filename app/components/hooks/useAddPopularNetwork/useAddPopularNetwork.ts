import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';

import Engine from '../../../core/Engine';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../useMetrics';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { addItemToChainIdList } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { Network } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../useNetworkSelection/useNetworkSelection';

interface UseAddPopularNetworkResult {
  /**
   * Adds a popular network directly without confirmation.
   * If the network is already added, it will switch to it.
   * @param networkConfiguration - The network configuration from PopularList
   * @param shouldSwitchNetwork - Whether to switch to the network after adding (default: true)
   * @returns Promise that resolves when the network is added/switched
   */
  addPopularNetwork: (
    networkConfiguration: Network,
    shouldSwitchNetwork?: boolean,
  ) => Promise<void>;
}

/**
 * Hook for adding popular networks directly without showing a confirmation modal.
 *
 * This hook is specifically designed for networks from the curated PopularList,
 * which have already been vetted, so no additional user confirmation is required.
 */
export const useAddPopularNetwork = (): UseAddPopularNetworkResult => {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();
  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const addPopularNetwork = useCallback(
    async (
      networkConfiguration: Network,
      shouldSwitchNetwork: boolean = true,
    ): Promise<void> => {
      const { NetworkController, MultichainNetworkController } = Engine.context;

      const {
        chainId,
        nickname,
        ticker,
        rpcUrl,
        failoverRpcUrls,
        rpcPrefs: { blockExplorerUrl },
      } = networkConfiguration;

      const hexChainId = toHex(chainId) as Hex;
      const existingNetwork = networkConfigurationByChainId[hexChainId];

      // Track the RPC_ADDED event for popular networks
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RPC_ADDED)
          .addProperties({
            chain_id: hexChainId,
            source: 'Popular network list',
            symbol: ticker,
            rpc_url_index: 0,
          })
          .build(),
      );

      let networkClientId: string | undefined;

      if (existingNetwork) {
        // Network already exists - update it and switch to it
        const updatedNetwork = await NetworkController.updateNetwork(
          existingNetwork.chainId,
          existingNetwork,
          existingNetwork.chainId === hexChainId
            ? {
                replacementSelectedRpcEndpointIndex:
                  existingNetwork.defaultRpcEndpointIndex,
              }
            : undefined,
        );

        networkClientId =
          updatedNetwork?.rpcEndpoints?.[updatedNetwork.defaultRpcEndpointIndex]
            ?.networkClientId;
      } else {
        // Network doesn't exist - add it
        const addedNetwork = await NetworkController.addNetwork({
          chainId: hexChainId,
          blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: blockExplorerUrl ? 0 : undefined,
          name: nickname,
          nativeCurrency: ticker,
          rpcEndpoints: [
            {
              url: rpcUrl,
              failoverUrls: failoverRpcUrls,
              name: nickname,
              type: RpcEndpointType.Custom,
            },
          ],
        });

        addTraitsToUser(addItemToChainIdList(hexChainId));

        networkClientId =
          addedNetwork?.rpcEndpoints?.[addedNetwork.defaultRpcEndpointIndex]
            ?.networkClientId;
      }

      // Update network filter to include this network
      selectNetwork(hexChainId);

      if (shouldSwitchNetwork && networkClientId) {
        // Switch to the network
        await MultichainNetworkController.setActiveNetwork(networkClientId);
        dispatch(networkSwitched({ networkUrl: rpcUrl, networkStatus: true }));
      }
    },
    [
      networkConfigurationByChainId,
      trackEvent,
      createEventBuilder,
      addTraitsToUser,
      selectNetwork,
      dispatch,
    ],
  );

  return {
    addPopularNetwork,
  };
};

export default useAddPopularNetwork;
