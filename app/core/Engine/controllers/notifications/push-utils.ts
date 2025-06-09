import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './create-push-message';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(async (notification) => {
    const notificationMessage = createNotificationMessage(notification);
    if (!notificationMessage) {
      return;
    }

    await NotificationsService.displayNotification({
      id: notification.id,
      pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
      title: notificationMessage.title,
      body: notificationMessage.description,
      data: notification,
    });
  });

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
