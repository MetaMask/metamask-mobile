import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(async (rawPayload) => {
    const title = rawPayload.notification?.title;
    const body = rawPayload.notification?.body;
    if (!title) {
      return;
    }
    await NotificationsService.displayNotification({
      pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
      id: rawPayload.data?.notification_id,
      title,
      body,
      data: rawPayload.data,
    });
  });

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
