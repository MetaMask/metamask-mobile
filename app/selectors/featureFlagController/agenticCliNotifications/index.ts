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

    // Build flag gates compilation; all environments (dev, exp/UAT, prod) default ON
    // when LaunchDarkly is missing. Honor explicit remote false to disable.
    return remoteValue !== false;
  },
);
