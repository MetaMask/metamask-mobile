import EventEmitter2 from 'eventemitter2';
import type {
  MarkAsReadNotificationsParam,
  NotificationServicesControllerEnableNotificationsOptions,
} from '@metamask/notification-services-controller/notification-services';
import Engine from '../../../core/Engine';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

const CLIENT_TYPE = 'mobile' as const;
const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

const previewTokenEventEmitter = new EventEmitter2();
const PREVIEW_TOKEN_UPDATE_EVENT = 'previewTokenUpdate';
let previewToken: string | undefined;

export function setContentPreviewToken(newPreviewToken?: string | null) {
  if (typeof newPreviewToken === 'string') {
    previewToken = newPreviewToken;
    previewTokenEventEmitter.emit(PREVIEW_TOKEN_UPDATE_EVENT, previewToken);
  }
}

export function getContentPreviewToken() {
  return previewToken;
}

export function subscribeToContentPreviewToken(
  callback: (token: string) => void,
) {
  const sub = previewTokenEventEmitter.on(PREVIEW_TOKEN_UPDATE_EVENT, callback);
  return () => sub.off(PREVIEW_TOKEN_UPDATE_EVENT, callback);
}

export const assertIsFeatureEnabled = () => {
  if (!isNotificationsFeatureEnabled()) {
    throw new Error(
      'Notifications Feature is not yet enabled, you should not have been able to access this yet!',
    );
  }
};

/**
 * Enable Notifications Switch
 * - This is used during onboarding and for the notifications settings toggle
 * - Enables wallet notifications, feature announcements, and push notifications
 */
export const enableNotifications = async (
  options?: NotificationServicesControllerEnableNotificationsOptions,
) => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.enableMetamaskNotifications(
    options,
  );
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
  await Engine.context.NotificationServicesController.disableNotificationServices();
};

/**
 * Push Notifications Switch
 * - Allows us to enable push notifications
 * @throws if fails to enable push notifications
 */
export const enablePushNotifications = async () => {
  assertIsFeatureEnabled();
  await Engine.context.NotificationServicesController.enablePushNotifications();
};

/**
 * Push Notifications Switch
 * - Allows us to disable push notifications
 */
export const disablePushNotifications = async () => {
  assertIsFeatureEnabled();
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
  await Engine.context.NotificationServicesController.fetchAndUpdateMetamaskNotifications(
    getContentPreviewToken(),
  );
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
