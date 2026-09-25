import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_NATIVE_HEADER_ENABLED = true;

/** Kill switch for the native iOS 26 Liquid Glass header; defaults to on. */
export const selectNativeHeaderEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (
      !hasProperty(remoteFeatureFlags, FeatureFlagNames.nativeHeaderEnabled)
    ) {
      return DEFAULT_NATIVE_HEADER_ENABLED;
    }
    const rawFlag = remoteFeatureFlags[FeatureFlagNames.nativeHeaderEnabled];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    return (
      validatedVersionGatedFeatureFlag(
        rawFlag as unknown as VersionGatedFeatureFlag,
      ) ?? DEFAULT_NATIVE_HEADER_ENABLED
    );
  },
);
