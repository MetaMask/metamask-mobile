import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

export const selectScamCallDetectionEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    __DEV__ ||
    ((remoteFeatureFlags.scamCallDetectionEnabled as boolean) ?? false),
);
