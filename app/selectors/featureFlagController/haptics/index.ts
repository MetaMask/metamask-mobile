import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_HAPTICS_KILL_SWITCH = false;

/**
 * Select whether the haptics kill switch is active.
 * When true, all haptic playback is blocked — this is the primary
 * rollback mechanism for haptic regressions in production.
 * Handles version-gated flag shape `{ enabled: boolean, minimumVersion: string }`
 * (see feature-flag-registry) and boolean overrides.
 * Defaults to false (haptics allowed) when the flag is absent or invalid.
 */
export const selectHapticsKillSwitch = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.hapticsKillSwitch)) {
      return DEFAULT_HAPTICS_KILL_SWITCH;
    }
    const rawFlag = remoteFeatureFlags[FeatureFlagNames.hapticsKillSwitch];

    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_HAPTICS_KILL_SWITCH
    );
  },
);
