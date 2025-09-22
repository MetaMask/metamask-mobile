import { RootState } from '../../reducers';

/**
 * Selector to get the NetworkConnectionBannersState
 *
 * @param state - Root redux state
 * @returns - NetworkConnectionBannersState state
 */
export const selectNetworkConnectionBannersState = (state: RootState) =>
  state.networkConnectionBanners;
