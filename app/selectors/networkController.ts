import { createSelector } from 'reselect';
import { InfuraNetworkType } from '@metamask/controller-utils';
import {
  BuiltInNetworkClientId,
  CustomNetworkClientId,
  NetworkConfiguration,
  NetworkState,
  RpcEndpointType,
} from '@metamask/network-controller';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { NETWORKS_CHAIN_ID } from '../constants/network';
import { selectTokenNetworkFilter } from './preferencesController';

interface InfuraRpcEndpoint {
  name?: string;
  networkClientId: BuiltInNetworkClientId;
  type: RpcEndpointType.Infura;
  url: `https://${InfuraNetworkType}.infura.io/v3/{infuraProjectId}`;
}
/**
 * A custom RPC endpoint is a reference to a user-defined server which fronts an
 * EVM chain. It may refer to an Infura network, but only by coincidence.
 */
interface CustomRpcEndpoint {
  name?: string;
  networkClientId: CustomNetworkClientId;
  type: RpcEndpointType.Custom;
  url: string;
}

type RpcEndpoint = InfuraRpcEndpoint | CustomRpcEndpoint;

export interface ProviderConfig {
  id?: string;
  nickname?: string;
  rpcUrl?: string;
  chainId: `0x${string}`;
  ticker: string;
  rpcPrefs: { blockExplorerUrl?: string };
  type: string;
}

// Helper function to return the default provider config (mainnet)
const getDefaultProviderConfig = (): ProviderConfig => ({
  chainId: NETWORKS_CHAIN_ID.MAINNET,
  ticker: 'ETH',
  rpcPrefs: {},
  type: RpcEndpointType.Infura,
});

// Helper function to create the provider config based on the network and endpoint
const createProviderConfig = (
  networkConfig: NetworkConfiguration,
  rpcEndpoint: RpcEndpoint,
): ProviderConfig => {
  const {
    chainId,
    nativeCurrency,
    name,
    blockExplorerUrls,
    defaultBlockExplorerUrlIndex,
  } = networkConfig;
  const blockExplorerIndex = defaultBlockExplorerUrlIndex ?? 0;
  const blockExplorerUrl = blockExplorerUrls?.[blockExplorerIndex];

  return {
    chainId,
    ticker: nativeCurrency,
    rpcPrefs: { ...(blockExplorerUrl && { blockExplorerUrl }) },
    type:
      rpcEndpoint.type === RpcEndpointType.Custom
        ? 'rpc'
        : rpcEndpoint.networkClientId,
    ...(rpcEndpoint.type === RpcEndpointType.Custom && {
      id: rpcEndpoint.networkClientId,
      nickname: name,
      rpcUrl: rpcEndpoint.url,
    }),
  };
};

const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectSelectedNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectProviderConfig = createDeepEqualSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState): ProviderConfig => {
    const selectedNetworkClientId =
      networkControllerState?.selectedNetworkClientId;
    const networkConfigurationsByChainId =
      networkControllerState?.networkConfigurationsByChainId ?? {};

    if (!networkConfigurationsByChainId || !selectedNetworkClientId) {
      return getDefaultProviderConfig();
    }

    for (const networkConfig of Object.values(networkConfigurationsByChainId)) {
      const matchingRpcEndpoint = networkConfig.rpcEndpoints.find(
        (endpoint) => endpoint.networkClientId === selectedNetworkClientId,
      );

      if (matchingRpcEndpoint) {
        return createProviderConfig(networkConfig, matchingRpcEndpoint);
      }
    }

    // Return default provider config (mainnet) if no matching network is found
    return getDefaultProviderConfig();
  },
);

export const selectTicker = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.ticker,
);

export const selectChainId = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.chainId,
);
export const selectProviderType = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.type,
);
export const selectNickname = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.nickname,
);
export const selectRpcUrl = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig.rpcUrl,
);

export const selectNetworkStatus = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.networksMetadata[
      networkControllerState.selectedNetworkClientId
    ].status,
);

export const selectNetworkConfigurations = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.networkConfigurationsByChainId,
);

export const selectNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectIsAllNetworks = createSelector(
  selectNetworkConfigurations,
  selectTokenNetworkFilter,
  (networkConfigurations, tokenNetworkFilter) =>
    Object.keys(tokenNetworkFilter).length ===
    Object.keys(networkConfigurations).length,
);
