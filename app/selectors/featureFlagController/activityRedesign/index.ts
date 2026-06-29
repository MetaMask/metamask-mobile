import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    remoteFeatureFlags.tmcuActivityRedesignEnabled === true,
);

export const selectIsTransactionsRedesignEnabled = createSelector(
  selectIsActivityRedesignEnabled,
  selectRemoteFeatureFlags,
  (isActivityRedesignEnabled, remoteFeatureFlags): boolean =>
    isActivityRedesignEnabled &&
    remoteFeatureFlags.tmcuTransactionsRedesignEnabled === true,
);
