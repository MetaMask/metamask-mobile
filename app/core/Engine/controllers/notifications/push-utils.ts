import { AppState } from 'react-native';
import { unregisterBrazePush } from '../../../Braze/unregisterPush';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { toFcmDataStringRecord } from '../../../../util/notifications/utils/fcm-data';

export const createRegToken = FCMService.createRegToken;

/**
 * Unregister this device from Braze before deleting the FCM token.
 * Retriable failures are persisted for retry on the next app launch. Permanent
 * failures throw so NaaP keeps the in-app toggle enabled.
 */
export const deleteRegToken = async (): Promise<boolean> => {
  await unregisterBrazePush();
  return FCMService.deleteRegToken();
};

/**
 * FCM `notification_type` for on-chain wallet activity (send/receive/etc).
 * Kept in sync with the iOS foreground-suppression key in
 * `ios/MetaMask/AppDelegate.swift` (`willPresent`).
 */
export const WALLET_ACTIVITY_NOTIFICATION_TYPE = 'wallet_activity';

/**
 * Whether a foreground FCM payload should show a system banner.
 * `wallet_activity` is suppressed because in-app transaction toasts already
 * surface it. Only suppresses when the app is actually in the foreground —
 * background/killed delivery is handled natively by the OS (Android
 * auto-displays the `notification` payload; iOS delivers via APNs) and must
 * not be filtered here.
 */
export function shouldDisplayForegroundPushNotification(
  data: Record<string, string> | undefined,
): boolean {
  if (AppState.currentState !== 'active') {
    return true;
  }
  return data?.notification_type !== WALLET_ACTIVITY_NOTIFICATION_TYPE;
}

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(async (rawPayload) => {
    const title = rawPayload.notification?.title;
    const body = rawPayload.notification?.body;
    if (!title) {
      return;
    }
    const data = toFcmDataStringRecord(rawPayload.data);
    if (!shouldDisplayForegroundPushNotification(data)) {
      return;
    }
    await NotificationsService.displayNotification({
      pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
      id: data?.notification_id,
      title,
      body,
      ...(data === undefined ? {} : { data }),
    });
  });

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
