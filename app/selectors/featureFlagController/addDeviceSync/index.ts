import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectAddDeviceSyncEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.addDeviceSyncEnabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.addDeviceSyncEnabled],
    ),
);
