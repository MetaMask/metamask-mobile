import { createSelector } from 'reselect';
import { EngineState } from './types';
import {
  ProviderConfig,
  NetworkState,
  NetworkType,
} from '@metamask/network-controller';

const selectNetworkControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectProviderConfig: ProviderConfig = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.providerConfig,
);

export const selectTicker: string = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.ticker,
);

export const selectChainId: string = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.chainId,
);
export const selectProviderType: NetworkType = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.type,
);
export const selectNickname: string = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig?.nickname,
);
export const selectRpcTarget: string = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig.rpcTarget,
);
export const selectNetwork: string = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => networkControllerState?.network,
);
