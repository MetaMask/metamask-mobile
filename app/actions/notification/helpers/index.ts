import type {
  MarkAsReadNotificationsParam,
  NotificationServicesControllerEnableNotificationsOptions,
} from '@metamask/notification-services-controller/notification-services';
import Engine from '../../../core/Engine';
import { unregisterBrazePush } from '../../../core/Braze/unregisterPush';
import { markBrazePushRegistrationDesired } from '../../../core/Braze/pushRegistrationState';
import Logger from '../../../util/Logger';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

const CLIENT_TYPE = 'mobile' as const;
const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

export const assertIsFeatureEnabled = () => {
  if (!isNotificationsFeatureEnabled()) {
    throw new Error(
      'Notifications Feature is not yet enabled, you should not have been able to access this yet!',
    );
  }
};

const markBrazePushRegistrationDesiredSafely = async (): Promise<void> => {
  try {
    await markBrazePushRegistrationDesired();
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      '[Braze] Failed to persist push registration intent',
    );
  }
};

/**
 * Enable Notifications Switch
 * - This is used during onboarding and for the notifications settings toggle
 * - Enables wallet notifications, feature announcements, and push notifications
 */
// Serialize callers before the first await (including Braze persistence). Controller
// loading state alone cannot protect two calls that arrive in the same JS turn.
let notificationEnableQueue: Promise<void> = Promise.resolve();
export const enableNotifications = (
  options?: NotificationServicesControllerEnableNotificationsOptions,
  requireReady = false,
): Promise<void> => {
  const operation = notificationEnableQueue.then(async () => {
    assertIsFeatureEnabled();
    const assertReady = () => {
      if (
        requireReady &&
        (!Engine.context.KeyringController.state.isUnlocked ||
          !Engine.context.AuthenticationController.state.isSignedIn)
      ) {
        throw new Error('Notification services are not ready');
      }
      if (
        Engine.context.NotificationServicesController.state
          .isUpdatingMetamaskNotifications
      ) {
        throw new Error('Notification services are already updating');
      }
    };
    assertReady();
    if (options?.registerPushNotifications !== false) {
      await markBrazePushRegistrationDesiredSafely();
    }
    assertReady();
    await Engine.context.NotificationServicesController.enableMetamaskNotifications(
      options,
    );
  });
  // A failed call must not poison subsequent explicit retries.
  notificationEnableQueue = operation.catch(() => undefined);
  return operation;
};

/**
 * Checks whether the authenticated user storage already has notification preferences.
 * A missing AUS row is returned as `null` by the service.
 */
export const hasNotificationPreferences = async () => {
  assertIsFeatureEnabled();
  const preferences = await Engine.controllerMessenger.call(
    GET_NOTIFICATION_PREFERENCES_ACTION,
  );
  return preferences != null;
};

export const setMarketingNotificationPreferencesEnabled = async (
  isEnabled: boolean,
) => {
  assertIsFeatureEnabled();
  const preferences = await Engine.controllerMessenger.call(
    GET_NOTIFICATION_PREFERENCES_ACTION,
  );

  if (!preferences) {
    return;
  }

  await Engine.controllerMessenger.call(
    PUT_NOTIFICATION_PREFERENCES_ACTION,
    {
      ...preferences,
      marketing: {
        ...preferences.marketing,
        inAppNotificationsEnabled: isEnabled,
        pushNotificationsEnabled: isEnabled,
      },
    },
    CLIENT_TYPE,
  );
};

/**
 * Disable Notifications Switch
 * - Disables wallet notifications, feature announcements, and push notifications
 */
export const disableNotifications = async () => {
  assertIsFeatureEnabled();
  if (!Engine.context.NotificationServicesPushController.state.fcmToken) {
    await unregisterBrazePush();
  }
  await Engine.context.NotificationServicesController.disableNotificationServices();
};

/**
 * Push Notifications Switch
 * - Allows us to enable push notifications
 * @throws if fails to enable push notifications
 */
export const enablePushNotifications = async () => {
  assertIsFeatureEnabled();
  await markBrazePushRegistrationDesiredSafely();
  await Engine.context.NotificationServicesController.enablePushNotifications();
};

/**
 * Push Notifications Switch
 * - Allows us to disable push notifications
 * When NaaP has no FCM token, unregisters Braze here because the push
 * controller otherwise returns before invoking its token-deletion callback.
 * Failures persist for retry on the next app session.
 */
export const disablePushNotifications = async () => {
  assertIsFeatureEnabled();
  if (!Engine.context.NotificationServicesPushController.state.fcmToken) {
    await unregisterBrazePush();
  }
  await Engine.context.NotificationServicesController.disablePushNotifications();
};

/**
 * Feature Announcement Switch
 * - Enables/Disables Feature Announcements
 * @param featureAnnouncementsEnabled boolean to toggle on/off
 */
export const toggleFeatureAnnouncements = async (
  featureAnnouncementsEnabled: boolean,
) => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.setFeatureAnnouncementsEnabled(
    featureAnnouncementsEnabled,
  );
};

/**
 * Account Notification Settings.
 * - Informs us which accounts have notifications enabled.
 * @param accounts - accounts to check
 * @returns Record of Address <> Boolean (for which accounts are enabled/disabled)
 */
export const fetchAccountNotificationSettings = async (accounts: string[]) => {
  assertIsFeatureEnabled();
  const accountsStatus =
    await Engine.context.NotificationServicesController.checkAccountsPresence(
      accounts,
    );

  return accountsStatus;
};

/**
 * Account Notification Settings.
 * - Allows us to delete notifications for accounts
 * @param accounts - accounts to disable notifications for
 */
export const disableAccounts = async (accounts: string[]) => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.disableAccounts(accounts);
};

/**
 * Account Notification Settings
 * - Allows us to enable notifications for accounts
 * @param accounts - accounts to enable notifications for
 */
export const enableAccounts = async (accounts: string[]) => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.enableAccounts(accounts);
};

/**
 * Fetch Notifications
 * - Use to invoke the series of fetch calls to get notifications
 * - Use Selectors to grab pending state and data
 * @throws Error if fails to fetch notifications
 */
export const fetchNotifications = async () => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.fetchAndUpdateMetamaskNotifications();
};

/**
 * Mark Notification as Read
 * - Fire this in the background to notify our services that a notification was read.
 * @param notifications - notifications to mark as read
 */
export const markNotificationsAsRead = async (
  notifications: MarkAsReadNotificationsParam,
) => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.markMetamaskNotificationsAsRead(
    notifications,
  );
};
