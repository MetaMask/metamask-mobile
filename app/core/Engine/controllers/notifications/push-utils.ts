import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { toFcmDataStringRecord } from '../../../../util/notifications/utils/fcm-data';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

/**
 * FCM `notification_type` for on-chain wallet activity (send/receive/etc).
 * Suppressed in the foreground so transaction toasts remain the primary
 * in-app surface; background/closed push still delivers via the OS.
 */
export const WALLET_ACTIVITY_NOTIFICATION_TYPE = 'wallet_activity';

/**
 * Whether a foreground FCM payload should show a system banner.
 * Background/killed delivery never reaches this path.
 */
export function shouldDisplayForegroundPushNotification(
  data: Record<string, string> | undefined,
): boolean {
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
      data,
    });
  });

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
