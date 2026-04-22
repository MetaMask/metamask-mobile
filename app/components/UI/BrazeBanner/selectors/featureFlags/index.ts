import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export const selectBrazeBannerHomeFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => Boolean(remoteFlags?.brazeBannerHome),
);
