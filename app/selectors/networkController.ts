import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import {
  ProviderConfig,
  NetworkState,
  NetworkStatus,
} from '@metamask/network-controller';

const selectNetworkControllerState = (state: RootState) =>
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
export const selectRpcUrl = createSelector(
  selectProviderConfig,
  (providerConfig: ProviderConfig) => providerConfig.rpcUrl,
);
export const selectNetworkId = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => networkControllerState?.networkId,
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

/**
 * Derive a value matching the now-removed property `network` that had been
 * included in the NetworkController state. It's set to "loading" if the
 * network is loading, but otherwise is set to the network ID.
 *
 * @deprecated Use networkStatus and networkId instead
 */
export const selectLegacyNetwork = createSelector(
  selectNetworkControllerState,
  (networkControllerState: NetworkState) => {
    const { networkId, selectedNetworkClientId, networksMetadata } =
      networkControllerState;

    return networksMetadata?.[selectedNetworkClientId].status !==
      NetworkStatus.Available
      ? 'loading'
      : networkId;
  },
);
