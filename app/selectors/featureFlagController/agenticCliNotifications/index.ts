import { createSelector } from 'reselect';
import { isE2E } from '../../../util/test/utils';
import { selectRemoteFeatureFlags } from '..';

export const selectAgenticCliNotificationsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (isE2E) {
      return true;
    }

    const buildFlagEnabled =
      process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED === 'true';

    if (!buildFlagEnabled) {
      return false;
    }

    const remoteValue = remoteFeatureFlags?.agenticCliNotificationsEnabled;

    // Local dev: default ON when LaunchDarkly flag is missing; honor explicit false.
    if (__DEV__) {
      return remoteValue !== false;
    }

    return Boolean(remoteValue);
  },
);
