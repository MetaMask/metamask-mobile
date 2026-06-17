import type {
  AgenticCliPreference,
  NotificationPreferences,
} from '@metamask/authenticated-user-storage';
import { DEFAULT_AGENTIC_CLI_PREFERENCES } from '@metamask/notification-services-controller';

/**
 * Agentic CLI notification preference section key (core#8933).
 */
export const AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION =
  'agenticCli' as const;

export type AgenticCliNotificationPreferenceSection =
  typeof AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION;

export const DEFAULT_AGENTIC_CLI_PREFERENCE: AgenticCliPreference = {
  ...DEFAULT_AGENTIC_CLI_PREFERENCES,
};

type PreferencesWithOptionalAgenticCli = Omit<
  NotificationPreferences,
  'agenticCli'
> & {
  agenticCli?: AgenticCliPreference;
};

export const isNotificationPreferencesMissingAgenticCli = (
  preferences: PreferencesWithOptionalAgenticCli | null | undefined,
): preferences is PreferencesWithOptionalAgenticCli =>
  preferences != null && preferences.agenticCli == null;

export const resolveAgenticCliPreference = (
  preferences: PreferencesWithOptionalAgenticCli | null | undefined,
): AgenticCliPreference =>
  preferences?.agenticCli ?? DEFAULT_AGENTIC_CLI_PREFERENCE;

export const withAgenticCliDefaults = <
  T extends PreferencesWithOptionalAgenticCli,
>(
  preferences: T,
): T & { agenticCli: AgenticCliPreference } => ({
  ...preferences,
  agenticCli: resolveAgenticCliPreference(preferences),
});
