import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => remoteFeatureFlags.tmcuActivityRedesignEnabled,
);
