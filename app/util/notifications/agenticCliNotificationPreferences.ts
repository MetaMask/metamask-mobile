import type { NotificationPreferences } from '@metamask/authenticated-user-storage';

/**
 * `agenticCli` notification channel preferences.
 * Aligns with {@link https://github.com/MetaMask/core/pull/8933}.
 */
export interface AgenticCliPreference {
  inAppNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

export const AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION =
  'agenticCli' as const;

export type AgenticCliNotificationPreferenceSection =
  typeof AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION;

export type NotificationStoragePreferencesWithAgenticCli =
  NotificationPreferences & {
    [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]: AgenticCliPreference;
  };

export const DEFAULT_AGENTIC_CLI_PREFERENCE: AgenticCliPreference = {
  pushNotificationsEnabled: false,
  inAppNotificationsEnabled: false,
};

const readAgenticCliFromPreferences = (
  preferences: NotificationPreferences | null | undefined,
): AgenticCliPreference | undefined => (preferences as NotificationStoragePreferencesWithAgenticCli | null)?.[
    AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION
  ];

export const resolveAgenticCliPreference = (
  preferences: NotificationPreferences | null | undefined,
): AgenticCliPreference => (
    readAgenticCliFromPreferences(preferences) ?? DEFAULT_AGENTIC_CLI_PREFERENCE
  );

/**
 * Merges `agenticCli` from API data and optional React Query cache (same session).
 * Does not use module-level state so values cannot leak across logout / account switch.
 */
export const mergeAgenticCliIntoPreferences = (
  preferences: NotificationPreferences,
  cachedPreferences?: NotificationPreferences | null,
): NotificationStoragePreferencesWithAgenticCli => {
  const agenticCli =
    readAgenticCliFromPreferences(preferences) ??
    readAgenticCliFromPreferences(cachedPreferences) ??
    DEFAULT_AGENTIC_CLI_PREFERENCE;

  return {
    ...preferences,
    [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]: agenticCli,
  };
};
