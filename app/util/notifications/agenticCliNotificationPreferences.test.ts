import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  DEFAULT_AGENTIC_CLI_PREFERENCE,
  mergeAgenticCliIntoPreferences,
  resolveAgenticCliPreference,
  stripAgenticCliFromNotificationPreferences,
  type NotificationStoragePreferencesWithAgenticCli,
} from './agenticCliNotificationPreferences';

describe('agenticCliNotificationPreferences', () => {
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

  it('uses client agenticCli when API and cache omit the section', () => {
    const basePreferences = {
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
    };

    const clientPreference = {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    };

    expect(
      mergeAgenticCliIntoPreferences(
        basePreferences,
        undefined,
        clientPreference,
      ),
    ).toEqual({
      ...basePreferences,
      agenticCli: clientPreference,
    });
  });

  it('uses cached agenticCli when API response omits the section', () => {
    const basePreferences = {
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
    };

    const cached = {
      ...basePreferences,
      agenticCli: {
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      },
    };

    expect(mergeAgenticCliIntoPreferences(basePreferences, cached)).toEqual(
      cached,
    );
  });

  it('strips agenticCli from preferences written to the API-shaped cache', () => {
    const preferencesWithAgenticCli = mergeAgenticCliIntoPreferences(
      {
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
      },
      undefined,
      {
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      },
    );

    expect(
      stripAgenticCliFromNotificationPreferences(preferencesWithAgenticCli),
    ).not.toHaveProperty('agenticCli');
  });

  it('returns stored agenticCli preferences when present', () => {
    const agenticCli = {
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    };

    const preferencesWithAgenticCli = mergeAgenticCliIntoPreferences({
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
      [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]: agenticCli,
    } as NotificationStoragePreferencesWithAgenticCli);

    expect(resolveAgenticCliPreference(preferencesWithAgenticCli)).toEqual(
      agenticCli,
    );
  });
});
