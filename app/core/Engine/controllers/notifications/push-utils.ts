import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './create-push-message';
import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications =
  (messenger: NotificationServicesPushControllerMessenger) => async () =>
    FCMService.listenToPushNotificationsReceived(async (notification) => {
      messenger.publish(
        'NotificationServicesPushController:onNewNotifications',
        notification,
      );

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
