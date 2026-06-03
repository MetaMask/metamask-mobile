import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

const isAgenticCliNotificationsEnabledInTest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';

export const selectAgenticCliNotificationsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (isAgenticCliNotificationsEnabledInTest) {
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
