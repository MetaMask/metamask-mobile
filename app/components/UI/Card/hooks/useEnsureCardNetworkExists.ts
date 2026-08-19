import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { PopularList } from '../../../../util/networks/customNetworks';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { BASE_SEPOLIA_RPC_URL } from '../constants';

// PopularList only curates production mainnets. Card feature dev/sandbox
// builds (e.g. Immersve funding against the Base Sepolia sandbox) need a
// testnet that will never appear there — this small map fills that gap
// without touching the app-wide PopularList used for regular network adds.
const CARD_TEST_NETWORKS: {
  chainId: Hex;
  nickname: string;
  rpcUrl: string;
  failoverRpcUrls?: string[];
  ticker: string;
  rpcPrefs: { blockExplorerUrl: string };
}[] = [
  {
    chainId: NETWORKS_CHAIN_ID.BASE_SEPOLIA,
    nickname: 'Base Sepolia',
    rpcUrl: BASE_SEPOLIA_RPC_URL,
    ticker: 'ETH',
    rpcPrefs: { blockExplorerUrl: 'https://sepolia.basescan.org' },
  },
];

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

      // Network is missing — find it in PopularList (or the Card-specific
      // testnet fallback) and add it
      const popularEntry =
        PopularList.find(
          (network) => toHex(network.chainId as string) === hexChainId,
        ) ??
        CARD_TEST_NETWORKS.find(
          (network) => toHex(network.chainId) === hexChainId,
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
