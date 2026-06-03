import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  DEFAULT_AGENTIC_CLI_PREFERENCE,
  resolveAgenticCliPreference,
  setClientAgenticCliPreferenceOverride,
} from './agenticCliNotificationPreferences';

describe('agenticCliNotificationPreferences', () => {
  afterEach(() => {
    setClientAgenticCliPreferenceOverride(null);
  });
  it('uses agenticCli as the preference section key', () => {
    expect(AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION).toBe('agenticCli');
  });

  it('returns defaults when agenticCli is missing from preferences', () => {
    expect(resolveAgenticCliPreference(null)).toEqual(
      DEFAULT_AGENTIC_CLI_PREFERENCE,
    );
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
    ).toEqual(DEFAULT_AGENTIC_CLI_PREFERENCE);
  });

  it('returns client override when agenticCli is missing from preferences', () => {
    setClientAgenticCliPreferenceOverride({
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });

    expect(resolveAgenticCliPreference(null)).toEqual({
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });
  });

  it('returns stored agenticCli preferences when present', () => {
    const agenticCli = {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    };

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
        agenticCli,
      }),
    ).toEqual(agenticCli);
  });
});
