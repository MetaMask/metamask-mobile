import { createSelector } from 'reselect';
import { EngineState } from './types';
import { ProviderConfig, NetworkState } from '@metamask/network-controller';

const selectNetworkControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.NetworkController;

export const selectProviderConfig = createSelector(
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
export const selectRpcTarget = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig.rpcTarget,
);
export const selectNetwork = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => networkControllerState?.network,
);
