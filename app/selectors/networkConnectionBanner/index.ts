import {
  networkConnectionBannerControllerSelectors,
  getDefaultNetworkConnectionBannerControllerState,
} from '@metamask/network-connection-banner-controller';
import type { RootState } from '../../reducers';

const selectControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NetworkConnectionBannerController ??
  getDefaultNetworkConnectionBannerControllerState();

/**
 * The banner status ('available' | 'degraded' | 'unavailable') from
 * `NetworkConnectionBannerController` state.
 *
 * @param state - The root redux state.
 * @returns The banner status.
 */
export const selectNetworkConnectionBannerStatus = (state: RootState) =>
  networkConnectionBannerControllerSelectors.selectNetworkConnectionBannerStatus(
    selectControllerState(state),
  );

/**
 * The failing network the banner describes, or `null` when no banner is shown.
 *
 * @param state - The root redux state.
 * @returns The failing network details, or `null`.
 */
export const selectNetworkConnectionBannerNetwork = (state: RootState) =>
  networkConnectionBannerControllerSelectors.selectNetworkConnectionBannerNetwork(
    selectControllerState(state),
  );
