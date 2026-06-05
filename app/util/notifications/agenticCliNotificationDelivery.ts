import {
  TRIGGER_TYPES,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import type { NotificationPreferences } from '@metamask/authenticated-user-storage';
import Engine from '../../core/Engine';
import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  type AgenticCliPreference,
  DEFAULT_AGENTIC_CLI_PREFERENCE,
  persistLocalAgenticCliPreference,
  readAgenticCliFromPreferences,
  readAgenticCliInAppDisabledAt,
  readLocalAgenticCliPreference,
  resolveAgenticCliPreference,
} from './agenticCliNotificationPreferences';

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;

/** Matches "Agentic CLI", "agentic_cli", "agentic-cli", etc. */
export const AGENTIC_CLI_TEXT_PATTERN = /agentic[\s_-]*cli/i;

/** Broader match for agentic notification copy (e.g. "Agentic test notification"). */
export const AGENTIC_NOTIFICATION_TEXT_PATTERN = /\bagentic\b/i;

export const textIndicatesAgenticCli = (
  text: string | null | undefined,
): boolean =>
  Boolean(
    text &&
      (AGENTIC_CLI_TEXT_PATTERN.test(text) ||
        AGENTIC_NOTIFICATION_TEXT_PATTERN.test(text)),
  );

const metadataIndicatesAgenticCli = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => {
  if (!metadata) {
    return false;
  }

  const kind = metadata.kind;
  if (typeof kind === 'string' && textIndicatesAgenticCli(kind)) {
    return true;
  }

  const preferenceSection = metadata.preferenceSection;
  if (preferenceSection === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION) {
    return true;
  }

  return textIndicatesAgenticCli(JSON.stringify(metadata));
};

export const remoteMessageIndicatesAgenticCli = (
  payload: FirebaseMessagingTypes.RemoteMessage,
): boolean => {
  if (textIndicatesAgenticCli(payload.notification?.title)) {
    return true;
  }

  if (textIndicatesAgenticCli(payload.notification?.body)) {
    return true;
  }

  if (textIndicatesAgenticCli(payload.data?.deeplink?.toString())) {
    return true;
  }

  if (payload.data?.metadata) {
    try {
      const metadata = JSON.parse(payload.data.metadata.toString()) as Record<
        string,
        unknown
      >;
      if (metadataIndicatesAgenticCli(metadata)) {
        return true;
      }
    } catch {
      // Ignore malformed metadata.
    }
  }

  if (textIndicatesAgenticCli(payload.data?.data?.toString())) {
    return true;
  }

  return false;
};

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

export const resolveAgenticCliPreferenceForDelivery =
  async (): Promise<AgenticCliPreference> => {
    const localPreference = readLocalAgenticCliPreference();

    try {
      const apiPreferences = (await Engine.controllerMessenger.call(
        GET_NOTIFICATION_PREFERENCES_ACTION,
      )) as NotificationPreferences | null;

      const fromApi = readAgenticCliFromPreferences(apiPreferences);
      if (fromApi) {
        persistLocalAgenticCliPreference(fromApi);
        return fromApi;
      }

      return localPreference ?? resolveAgenticCliPreference(apiPreferences);
    } catch {
      return localPreference ?? DEFAULT_AGENTIC_CLI_PREFERENCE;
    }
  };

export const shouldSuppressAgenticCliPushDelivery = async (
  notification: INotification | null | undefined,
  payload?: FirebaseMessagingTypes.RemoteMessage,
): Promise<boolean> => {
  const isAgentic =
    (notification && notificationIndicatesAgenticCli(notification)) ||
    (payload && remoteMessageIndicatesAgenticCli(payload));

  if (!isAgentic) {
    return false;
  }

  const preference = await resolveAgenticCliPreferenceForDelivery();
  return !preference.pushNotificationsEnabled;
};

/**
 * Hides only agentic notifications that arrived after in-app was turned off.
 * Historical items remain visible, matching perps/marketing inbox behavior.
 */
export const shouldHideNewAgenticCliInAppNotification = (
  notification: INotification,
  preference: AgenticCliPreference,
  inAppDisabledAt: number | null = readAgenticCliInAppDisabledAt(),
): boolean => {
  if (preference.inAppNotificationsEnabled) {
    return false;
  }

  if (!notificationIndicatesAgenticCli(notification)) {
    return false;
  }

  if (inAppDisabledAt === null) {
    return false;
  }

  const createdAt = Number(notification.createdAt);
  if (Number.isNaN(createdAt)) {
    return false;
  }

  return createdAt >= inAppDisabledAt;
};
