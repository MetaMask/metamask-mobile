import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { toFcmDataStringRecord } from '../../../../util/notifications/utils/fcm-data';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(async (rawPayload) => {
    const title = rawPayload.notification?.title;
    const body = rawPayload.notification?.body;
    if (!title) {
      return;
    }
    const data = toFcmDataStringRecord(rawPayload.data);
    await NotificationsService.displayNotification({
      pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
      id: data?.notification_id,
      title,
      body,
      data,
    });
  });

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
