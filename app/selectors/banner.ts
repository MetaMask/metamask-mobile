import { RootState } from '../reducers';

export const selectDismissedBanners = (state: RootState) =>
  state.banners.dismissedBanners;
