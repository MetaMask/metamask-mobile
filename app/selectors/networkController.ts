import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { createDeepEqualSelector } from './util';
import Engine from '../core/Engine';
import { Hex } from '@metamask/utils';
import { NetworkList } from '../util/networks';

export interface ProviderConfig {
  chainId: Hex;
  ticker: string;
  rpcUrl: string;
  type: string;
  nickname: string | undefined;
  network?: string;
}

const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectSelectedNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);

export const selectProviderConfig = createDeepEqualSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => {
    const selectedNetworkClientId =
      networkControllerState?.selectedNetworkClientId;
    const networkConfigurationsByChainId =
      networkControllerState?.networkConfigurationsByChainId;

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
  },
);

export const selectTicker = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.ticker,
);

export const selectChainId = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.chainId,
);
export const selectProviderType = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.type,
);
export const selectNickname = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.nickname,
);
export const selectRpcUrl = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig?.rpcUrl,
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
