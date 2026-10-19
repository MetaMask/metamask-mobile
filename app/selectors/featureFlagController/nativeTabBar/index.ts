import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_NATIVE_TAB_BAR_ENABLED = true;

/** Kill switch for the native iOS 26 tab bar; defaults to on. */
export const selectNativeTabBarEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (
      !hasProperty(remoteFeatureFlags, FeatureFlagNames.nativeTabBarEnabled)
    ) {
      return DEFAULT_NATIVE_TAB_BAR_ENABLED;
    }
    const rawFlag = remoteFeatureFlags[FeatureFlagNames.nativeTabBarEnabled];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    return (
      validatedVersionGatedFeatureFlag(
        rawFlag as unknown as VersionGatedFeatureFlag,
      ) ?? DEFAULT_NATIVE_TAB_BAR_ENABLED
    );
  },
);
