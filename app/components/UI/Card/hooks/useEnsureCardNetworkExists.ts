import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { PopularList } from '../../../../util/networks/customNetworks';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';

/**
 * Ensures a Card-supported EVM network exists in the user's network list.
 * If the network is missing, it automatically adds it from the PopularList and enables it.
 */
export const useEnsureCardNetworkExists = () => {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const { enableNetwork } = useNetworkEnablement();

  /**
   * Ensures the network for the given CAIP chain ID exists and returns its networkClientId.
   */
  const ensureNetworkExists = useCallback(
    async (caipChainId: string): Promise<string> => {
      const hexChainId = safeFormatChainIdToHex(caipChainId) as Hex;

      // Network already exists — return existing networkClientId
      const existingConfig = networkConfigurations[hexChainId];
      if (existingConfig) {
        const { rpcEndpoints, defaultRpcEndpointIndex } = existingConfig;
        return rpcEndpoints[defaultRpcEndpointIndex].networkClientId;
      }

      // Network is missing — find it in PopularList and add it
      const popularEntry = PopularList.find(
        (network) => toHex(network.chainId as string) === hexChainId,
      );

      if (!popularEntry) {
        throw new Error(
          `Network not found in PopularList for chain ID ${caipChainId}`,
        );
      }

      const { NetworkController } = Engine.context;

      const addedNetwork = await NetworkController.addNetwork({
        chainId: hexChainId,
        blockExplorerUrls: popularEntry.rpcPrefs?.blockExplorerUrl
          ? [popularEntry.rpcPrefs.blockExplorerUrl]
          : [],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: popularEntry.rpcPrefs?.blockExplorerUrl
          ? 0
          : undefined,
        name: popularEntry.nickname,
        nativeCurrency: popularEntry.ticker,
        rpcEndpoints: [
          {
            url: popularEntry.rpcUrl,
            failoverUrls: popularEntry.failoverRpcUrls,
            name: popularEntry.nickname,
            type: RpcEndpointType.Custom,
          },
        ],
      });

      // Enable the newly added network in the network filter
      enableNetwork(caipChainId as CaipChainId);

      const networkClientId =
        addedNetwork?.rpcEndpoints?.[addedNetwork.defaultRpcEndpointIndex]
          ?.networkClientId;

      if (!networkClientId) {
        throw new Error(
          `Failed to get networkClientId after adding network for ${caipChainId}`,
        );
      }

      return networkClientId;
    },
    [networkConfigurations, enableNetwork],
  );

  return { ensureNetworkExists };
};
