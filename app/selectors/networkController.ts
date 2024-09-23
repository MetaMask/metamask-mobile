import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { createDeepEqualSelector } from './util';
import { NETWORKS_CHAIN_ID } from '../constants/network';

export interface ProviderConfig {
  id?: string | undefined;
  nickname?: string | undefined;
  rpcUrl?: string | undefined;
  chainId: `0x${string}`;
  ticker: string;
  rpcPrefs: { blockExplorerUrl?: string | undefined };
  type: string;
}

const selectNetworkControllerState = (state: RootState) => {
  console.log(
    'IM HERE ******',
    state?.engine?.backgroundState?.NetworkController,
  );
  return state?.engine?.backgroundState?.NetworkController;
};

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
      networkControllerState?.networkConfigurationsByChainId;

    // console.log('PPPPPPP *********', networkControllerState);

    for (const network of Object.values(networkConfigurationsByChainId)) {
      for (const rpcEndpoint of network.rpcEndpoints) {
        if (rpcEndpoint.networkClientId === selectedNetworkClientId) {
          const indexToUse = network.defaultBlockExplorerUrlIndex ?? 0;
          const blockExplorerUrl = network.blockExplorerUrls?.[indexToUse];

          return {
            chainId: network.chainId,
            ticker: network.nativeCurrency,
            rpcPrefs: { ...(blockExplorerUrl && { blockExplorerUrl }) },
            type:
              rpcEndpoint.type === RpcEndpointType.Custom
                ? 'rpc'
                : rpcEndpoint.networkClientId,
            ...(rpcEndpoint.type === RpcEndpointType.Custom && {
              id: rpcEndpoint.networkClientId,
              nickname: network.name,
              rpcUrl: rpcEndpoint.url,
            }),
          };
        }
      }
    }
    // return mainnet by default
    return {
      chainId: NETWORKS_CHAIN_ID.MAINNET,
      ticker: 'ETH',
      rpcPrefs: {},
      type: RpcEndpointType.Infura,
    };
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
