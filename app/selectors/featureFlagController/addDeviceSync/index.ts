import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  ADD_DEVICE_SYNC_MINIMUM_VERSION,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_ADD_DEVICE_SYNC_ENABLED = false;

export const selectAddDeviceSyncEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (
      !hasProperty(remoteFeatureFlags, FeatureFlagNames.addDeviceSyncEnabled)
    ) {
      return DEFAULT_ADD_DEVICE_SYNC_ENABLED;
    }

    const rawFlag = remoteFeatureFlags[FeatureFlagNames.addDeviceSyncEnabled];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_ADD_DEVICE_SYNC_ENABLED
    );
  },
);

export { ADD_DEVICE_SYNC_MINIMUM_VERSION };
