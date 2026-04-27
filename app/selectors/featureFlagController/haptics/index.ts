import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';

/**
 * Select whether the haptics kill switch is active.
 * When true, all haptic playback is blocked — this is the primary
 * rollback mechanism for haptic regressions in production.
 * Defaults to false (haptics allowed) when the flag is absent.
 */
export const selectHapticsKillSwitch = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.hapticsKillSwitch)) {
      return false;
    }
    return remoteFeatureFlags[FeatureFlagNames.hapticsKillSwitch] === true;
  },
);
