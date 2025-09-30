import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export const selectContentfulCarouselEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => Boolean(remoteFlags?.contentfulCarouselEnabled),
);
export const selectCarouselBannersFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => Boolean(remoteFlags?.carouselBanners),
);
