import { createSelector } from 'reselect';
import type { NetworkConnectionBannerControllerState } from '@metamask/network-connection-banner-controller';
import type {
  NetworkConnectionBannerState,
  NetworkConnectionBannerStatus,
} from '../../components/UI/NetworkConnectionBanner/types';
import type { RootState } from '../../reducers';

const selectNetworkConnectionBannerControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkConnectionBannerController as
    | NetworkConnectionBannerControllerState
    | undefined;

/**
 * Selector that exposes the banner state to the UI. Reads from the
 * `NetworkConnectionBannerController` state in `engine.backgroundState` and
 * maps it to the legacy `{ visible: boolean }` shape the banner component
 * consumes.
 *
 * @param state - The root redux state.
 * @returns The banner state for the UI to render.
 */
export const selectNetworkConnectionBannerState = createSelector(
  [selectNetworkConnectionBannerControllerState],
  (controllerState): NetworkConnectionBannerState => {
    if (
      !controllerState ||
      controllerState.networkConnectionBannerStatus === 'available' ||
      !controllerState.networkConnectionBannerNetwork
    ) {
      return { visible: false };
    }
    const { networkConnectionBannerStatus, networkConnectionBannerNetwork } =
      controllerState;
    return {
      visible: true,
      chainId: networkConnectionBannerNetwork.chainId,
      status: networkConnectionBannerStatus as NetworkConnectionBannerStatus,
      networkName: networkConnectionBannerNetwork.name,
      rpcUrl: networkConnectionBannerNetwork.rpcUrl,
      isInfuraEndpoint: networkConnectionBannerNetwork.isInfuraEndpoint,
      canSwitchToInfura:
        networkConnectionBannerNetwork.switchableInfuraNetworkClientId !== null,
    };
  },
);
