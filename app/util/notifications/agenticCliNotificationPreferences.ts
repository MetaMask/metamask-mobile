import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import { STORAGE_IDS } from './settings/storage/constants';
import { mmStorage } from './settings/storage';

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

export const AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY = [
  'AuthenticatedUserStorageService:getNotificationPreferences',
  'agenticCliClientPreference',
] as const;

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

export const readAgenticCliFromPreferences = (
  preferences: NotificationPreferences | null | undefined,
): AgenticCliPreference | undefined =>
  (preferences as NotificationStoragePreferencesWithAgenticCli | null)?.[
    AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION
  ];

export const resolveAgenticCliPreference = (
  preferences: NotificationPreferences | null | undefined,
): AgenticCliPreference =>
  readAgenticCliFromPreferences(preferences) ?? DEFAULT_AGENTIC_CLI_PREFERENCE;

/**
 * Merges `agenticCli` from API data and optional React Query cache (same session).
 * Does not use module-level state so values cannot leak across logout / account switch.
 */
/** Strips client-only `agenticCli` before writing the main React Query cache (API-shaped). */
export const stripAgenticCliFromNotificationPreferences = (
  preferences: NotificationStoragePreferencesWithAgenticCli,
): NotificationPreferences => {
  const {
    [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]: _agenticCli,
    ...apiPreferences
  } = preferences;

  return apiPreferences;
};

export const persistLocalAgenticCliPreference = (
  preference: AgenticCliPreference,
): void => {
  mmStorage.saveLocal(
    STORAGE_IDS.AGENTIC_CLI_NOTIFICATION_PREFERENCES,
    preference,
  );
};

export const readLocalAgenticCliPreference =
  (): AgenticCliPreference | null => {
    const stored = mmStorage.getLocal(
      STORAGE_IDS.AGENTIC_CLI_NOTIFICATION_PREFERENCES,
    ) as AgenticCliPreference | undefined;

    if (
      stored &&
      typeof stored.pushNotificationsEnabled === 'boolean' &&
      typeof stored.inAppNotificationsEnabled === 'boolean'
    ) {
      return stored;
    }

    return null;
  };

export const clearLocalAgenticCliPreference = (): void => {
  mmStorage.saveLocal(STORAGE_IDS.AGENTIC_CLI_NOTIFICATION_PREFERENCES, null);
};

export const mergeAgenticCliIntoPreferences = (
  preferences: NotificationPreferences,
  cachedPreferences?: NotificationPreferences | null,
  clientAgenticCliPreference?: AgenticCliPreference | null,
  localAgenticCliPreference: AgenticCliPreference | null = readLocalAgenticCliPreference(),
): NotificationStoragePreferencesWithAgenticCli => {
  const agenticCli =
    readAgenticCliFromPreferences(preferences) ??
    readAgenticCliFromPreferences(cachedPreferences) ??
    clientAgenticCliPreference ??
    localAgenticCliPreference ??
    DEFAULT_AGENTIC_CLI_PREFERENCE;

  return {
    ...preferences,
    [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]: agenticCli,
  };
};
