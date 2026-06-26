import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => true,
  // remoteFeatureFlags.tmcuActivityRedesignEnabled === true,
);

export const selectIsTransactionsRedesignEnabled = createSelector(
  selectIsActivityRedesignEnabled,
  selectRemoteFeatureFlags,
  (isActivityRedesignEnabled, remoteFeatureFlags): boolean => true,
  // isActivityRedesignEnabled &&
  // remoteFeatureFlags.tmcuTransactionsRedesignEnabled === true,
);
