import {
  processAndFilterNotifications,
  TRIGGER_TYPES,
  toRawAPINotification,
  type UnprocessedRawNotification,
} from '@metamask/notification-services-controller/notification-services';
import Engine from '../../core/Engine';
import { devApiEnv } from '../../core/devApiEnv';
import I18n from '../../../locales/i18n';
import Logger from '../Logger';
import {
  applyAgenticCliInAppInboxFilterToController,
  isAgenticCliInAppNotificationsEnabled,
} from './agenticCliNotificationFilter';
import {
  getEnabledWalletActivityAddresses,
  readValidatedNotificationPreferences,
} from './ensureAgenticCliNotificationPreferencesMigrated';
import { updateNotificationServicesControllerState } from './updateNotificationServicesControllerState';

const NOTIFICATION_API_BASE: Record<'dev' | 'prod', string> = {
  dev: 'https://notification.dev-api.cx.metamask.io',
  prod: 'https://notification.api.cx.metamask.io',
};

const fetchOnChainNotificationsFromApi = async (
  bearerToken: string,
  addresses: string[],
): Promise<ReturnType<typeof toRawAPINotification>[]> => {
  if (addresses.length === 0) {
    return [];
  }

  const endpoint = `${NOTIFICATION_API_BASE[devApiEnv()]}/api/v3/notifications`;
  const body = {
    addresses: addresses.map((address) => address.toLowerCase()),
    locale: I18n.locale,
    platform: 'mobile' as const,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!response?.ok) {
    Logger.error(
      new Error(
        `Notification API list request failed with status ${response?.status ?? 'unknown'}`,
      ),
      'Failed to fetch notifications using raw wallet-activity preferences',
    );
    return [];
  }

  const notifications = (await response.json().catch(() => null)) as
    | UnprocessedRawNotification[]
    | null;

  return (
    notifications
      ?.map((notification) => {
        if (!notification.notification_type) {
          return undefined;
        }

        try {
          return toRawAPINotification(notification);
        } catch {
          return undefined;
        }
      })
      .filter((item): item is ReturnType<typeof toRawAPINotification> =>
        Boolean(item),
      ) ?? []
  );
};

const hasFetchedOnChainNotifications = (
  notifications: { type: string }[],
): boolean =>
  notifications.some(
    (notification) =>
      notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT &&
      notification.type !== TRIGGER_TYPES.SNAP,
  );

/**
 * Fetches on-chain / platform notifications using enabled addresses from raw AUS
 * preferences when validated GET still fails on legacy blobs missing `agenticCli`.
 */
export const supplementNotificationsFromRawPreferences =
  async (): Promise<void> => {
    const controller = Engine.context.NotificationServicesController;

    if (!controller.state.isNotificationServicesEnabled) {
      return;
    }

    const validatedPreferences = await readValidatedNotificationPreferences();
    const inAppEnabled = await isAgenticCliInAppNotificationsEnabled();

    if (!inAppEnabled) {
      await applyAgenticCliInAppInboxFilterToController();
      return;
    }

    const enabledAddresses = await getEnabledWalletActivityAddresses();

    if (enabledAddresses.length === 0) {
      return;
    }

    const shouldSupplement =
      validatedPreferences == null ||
      !hasFetchedOnChainNotifications(
        controller.state.metamaskNotificationsList,
      );

    if (!shouldSupplement) {
      return;
    }

    const bearerToken =
      await Engine.context.AuthenticationController.getBearerToken();
    const rawOnChainNotifications = await fetchOnChainNotificationsFromApi(
      bearerToken,
      enabledAddresses,
    );

    Logger.log(
      `Raw-preferences notification fetch returned ${rawOnChainNotifications.length} item(s) for ${enabledAddresses.length} enabled address(es)`,
    );

    if (rawOnChainNotifications.length === 0) {
      return;
    }

    const readIds = controller.state.metamaskNotificationsReadList;
    const snapNotifications = controller.state.metamaskNotificationsList.filter(
      (notification) => notification.type === TRIGGER_TYPES.SNAP,
    );
    const featureAnnouncements =
      controller.state.metamaskNotificationsList.filter(
        (notification) =>
          notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      );

    const processedOnChainNotifications = processAndFilterNotifications(
      rawOnChainNotifications,
      readIds,
    );

    const metamaskNotifications = [
      ...featureAnnouncements,
      ...processedOnChainNotifications,
      ...snapNotifications,
    ].sort(
      (notificationA, notificationB) =>
        new Date(notificationB.createdAt).getTime() -
        new Date(notificationA.createdAt).getTime(),
    );

    updateNotificationServicesControllerState((state) => {
      state.metamaskNotificationsList = metamaskNotifications;
    });

    await applyAgenticCliInAppInboxFilterToController();
  };
