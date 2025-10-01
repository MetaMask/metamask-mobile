import { RootState } from '../../reducers';

/**
 * Selector to get the NetworkConnectionBannerState
 *
 * @param state - Root redux state
 * @returns - NetworkConnectionBannerState state
 */
export const selectNetworkConnectionBannerState = (state: RootState) =>
  state.networkConnectionBanner;
