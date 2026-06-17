import {
  TRIGGER_TYPES,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';
import { readNotificationPreferencesForUpdate } from './ensureAgenticCliNotificationPreferencesMigrated';
import { resolveAgenticCliPreference } from './agenticCliNotificationPreferences';
import { updateNotificationServicesControllerState } from './updateNotificationServicesControllerState';

/** Matches "Agentic CLI", "agentic_cli", "agentic-cli", etc. */
const AGENTIC_CLI_TEXT_PATTERN = /agentic[\s_-]*cli/i;

/** Broader match for agentic notification copy (e.g. "Agentic test notification"). */
const AGENTIC_NOTIFICATION_TEXT_PATTERN = /\bagentic\b/i;

export const textIndicatesAgenticCli = (
  text: string | null | undefined,
): boolean =>
  Boolean(
    text &&
      (AGENTIC_CLI_TEXT_PATTERN.test(text) ||
        AGENTIC_NOTIFICATION_TEXT_PATTERN.test(text)),
  );

export const notificationIndicatesAgenticCli = (
  notification: INotification,
): boolean => {
  if (notification.type === TRIGGER_TYPES.PLATFORM) {
    const platformNotification = notification as INotification & {
      template?: { title?: string; body?: string; cta?: { label?: string } };
    };

    if (textIndicatesAgenticCli(platformNotification.template?.title)) {
      return true;
    }

    if (textIndicatesAgenticCli(platformNotification.template?.body)) {
      return true;
    }

    if (textIndicatesAgenticCli(platformNotification.template?.cta?.label)) {
      return true;
    }
  }

  return textIndicatesAgenticCli(JSON.stringify(notification));
};

export const isAgenticCliInAppNotificationsEnabled =
  async (): Promise<boolean> => {
    const preferences = await readNotificationPreferencesForUpdate();
    return resolveAgenticCliPreference(preferences).inAppNotificationsEnabled;
  };

export const filterAgenticCliNotificationsForInAppPreference = (
  notifications: INotification[],
  inAppEnabled: boolean,
): INotification[] => {
  if (inAppEnabled) {
    return notifications;
  }

  return notifications.filter(
    (notification) => !notificationIndicatesAgenticCli(notification),
  );
};

export const applyAgenticCliInAppInboxFilterToController =
  async (): Promise<void> => {
    const inAppEnabled = await isAgenticCliInAppNotificationsEnabled();
    if (inAppEnabled) {
      return;
    }

    updateNotificationServicesControllerState((state) => {
      state.metamaskNotificationsList =
        filterAgenticCliNotificationsForInAppPreference(
          state.metamaskNotificationsList,
          false,
        );
    });
  };
