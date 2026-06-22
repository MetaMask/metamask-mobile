import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './create-push-message';
import { isNotificationSuppressedByPreferences } from './notification-preference-filter';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(async (notification) => {
    const notificationMessage = createNotificationMessage(notification);
    if (!notificationMessage) {
      return;
    }

    // Check user notification preferences before displaying.
    // This is a client-side safety net: if the user has disabled push
    // notifications for this category, we drop the notification even if
    // the server sent it (e.g., due to propagation delay).
    if (await isNotificationSuppressedByPreferences(notification)) {
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
