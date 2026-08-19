import { RootState } from '../reducers';

export const selectDismissedBanners = (state: RootState) =>
  state?.banners?.dismissedBanners ?? [];

export const selectLastDismissedBrazeBanner = (state: RootState) =>
  state?.banners?.lastDismissedBrazeBanner ?? null;
