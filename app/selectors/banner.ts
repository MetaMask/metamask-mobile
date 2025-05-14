import { RootState } from '../reducers';
import { createSelector } from 'reselect';

const selectBannersState = (state: RootState) => state.banners.dismissedBanners;

export const selectDismissedBanners = createSelector(
  selectBannersState,
  (dismissedBanners) => dismissedBanners,
);
