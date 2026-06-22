import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => true,
  // remoteFeatureFlags.tmcuActivityRedesignEnabled === true,
);
