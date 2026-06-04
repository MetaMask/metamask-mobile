import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * LaunchDarkly / remote feature flag key for Agentic CLI notification settings UI.
 */
export const AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY =
  'agentic_cli_notifications_enabled' as const;

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

    const remoteValue =
      remoteFeatureFlags?.[AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY];

    return Boolean(remoteValue);
  },
);
