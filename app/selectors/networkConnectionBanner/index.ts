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
      controllerState.status === 'available' ||
      !controllerState.network
    ) {
      return { visible: false };
    }
    return {
      visible: true,
      chainId: controllerState.network.chainId,
      status: controllerState.status as NetworkConnectionBannerStatus,
      networkName: controllerState.network.networkName,
      rpcUrl: controllerState.network.rpcUrl,
      isInfuraEndpoint: controllerState.network.isInfuraEndpoint,
      infuraNetworkClientId:
        controllerState.network.infuraNetworkClientId ?? undefined,
    };
  },
);
