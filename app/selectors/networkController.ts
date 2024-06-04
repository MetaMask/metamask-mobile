import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { ProviderConfig, NetworkState } from '@metamask/network-controller';
import { createDeepEqualSelector } from './util';

const selectNetworkControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectProviderConfig = createDeepEqualSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) =>
    networkControllerState?.providerConfig,
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
