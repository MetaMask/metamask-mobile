import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    remoteFeatureFlags.tmcuActivityRedesignEnabled === true,
);
