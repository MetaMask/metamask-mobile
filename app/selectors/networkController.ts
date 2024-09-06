import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { NetworkState, NetworkClientType } from '@metamask/network-controller';
import { createDeepEqualSelector } from './util';
import Engine from '../core/Engine';
import { Hex } from '@metamask/utils';
import { NetworkList } from '../util/networks';

export interface ProviderConfig {
  chainId: Hex;
  ticker: string;
  rpcUrl: string;
  type: NetworkClientType;
  nickname: string | undefined;
  network?: string;
}

const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectProviderConfig = createDeepEqualSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => {
    const { NetworkController } = Engine?.context || {};

    const builtInNetwork =
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      NetworkList[networkControllerState?.selectedNetworkClientId];

    const networkConfiguration = NetworkController?.getNetworkClientById(
      networkControllerState?.selectedNetworkClientId,
    ).configuration;

    return builtInNetwork
      ? {
          ...builtInNetwork,
          type: networkControllerState?.selectedNetworkClientId,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          rpcPrefs: { blockExplorerUrl: builtInNetwork.blockExplorerUrl },
        }
      : {
          ...networkConfiguration,
          type: 'rpc',
          nickname:
            networkControllerState?.networkConfigurations?.[
              networkControllerState?.selectedNetworkClientId
            ]?.nickname,
        };
  },
);

export const selectTicker = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.ticker,
);

export const selectChainId = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.chainId,
);
export const selectProviderType = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.type,
);
export const selectNickname = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.nickname,
);
export const selectRpcUrl = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig.rpcUrl,
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
    networkControllerState.networkConfigurations,
);

export const selectNetworkClientId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState.selectedNetworkClientId,
);
