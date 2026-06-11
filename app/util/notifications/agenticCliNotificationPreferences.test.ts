import { DEFAULT_AGENTIC_CLI_PREFERENCES } from '@metamask/notification-services-controller';
import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  isNotificationPreferencesMissingAgenticCli,
  resolveAgenticCliPreference,
  withAgenticCliDefaults,
} from './agenticCliNotificationPreferences';

describe('agenticCliNotificationPreferences', () => {
  it('uses agenticCli as the preference section key', () => {
    expect(AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION).toBe('agenticCli');
  });

  it('detects when agenticCli is missing from stored preferences', () => {
    expect(
      isNotificationPreferencesMissingAgenticCli({
        walletActivity: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [],
        },
        marketing: {
          inAppNotificationsEnabled: false,
          pushNotificationsEnabled: false,
        },
        perps: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
        socialAI: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          mutedTraderProfileIds: [],
        },
      }),
    ).toBe(true);
    expect(
      isNotificationPreferencesMissingAgenticCli({
        walletActivity: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [],
        },
        marketing: {
          inAppNotificationsEnabled: false,
          pushNotificationsEnabled: false,
        },
        perps: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
        socialAI: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          mutedTraderProfileIds: [],
        },
        agenticCli: DEFAULT_AGENTIC_CLI_PREFERENCES,
      }),
    ).toBe(false);
  });

  it('returns core defaults when agenticCli is missing from API preferences', () => {
    expect(
      resolveAgenticCliPreference({
        walletActivity: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [],
        },
        marketing: {
          inAppNotificationsEnabled: false,
          pushNotificationsEnabled: false,
        },
        perps: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
        socialAI: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          mutedTraderProfileIds: [],
        },
      }),
    ).toEqual(DEFAULT_AGENTIC_CLI_PREFERENCES);
  });

  it('merges agenticCli defaults into preferences for PUT payloads', () => {
    expect(
      withAgenticCliDefaults({
        walletActivity: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          accounts: [],
        },
        marketing: {
          inAppNotificationsEnabled: false,
          pushNotificationsEnabled: false,
        },
        perps: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
        socialAI: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
          mutedTraderProfileIds: [],
        },
      }).agenticCli,
    ).toEqual(DEFAULT_AGENTIC_CLI_PREFERENCES);
  });
});
