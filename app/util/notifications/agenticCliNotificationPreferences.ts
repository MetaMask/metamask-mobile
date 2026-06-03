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

/**
 * Client-side cache for `agenticCli` while user-storage API responses omit the
 * section (pre-core#8933). Shared across notification settings screens.
 */
let clientAgenticCliPreferenceOverride: AgenticCliPreference | null = null;

export const setClientAgenticCliPreferenceOverride = (
  preference: AgenticCliPreference | null,
) => {
  clientAgenticCliPreferenceOverride = preference;
};

export const resolveAgenticCliPreference = (
  preferences: NotificationPreferences | null | undefined,
): AgenticCliPreference => {
  const agenticCli = (
    preferences as NotificationStoragePreferencesWithAgenticCli | null
  )?.[AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION];

  if (agenticCli) {
    clientAgenticCliPreferenceOverride = agenticCli;
    return agenticCli;
  }

  return clientAgenticCliPreferenceOverride ?? DEFAULT_AGENTIC_CLI_PREFERENCE;
};
