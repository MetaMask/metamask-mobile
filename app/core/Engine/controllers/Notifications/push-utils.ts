import type { Types } from '@metamask/notification-services-controller/push-services';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './create-push-message';

export const createRegToken: Types.CreateRegToken = FCMService.createRegToken;
export const deleteRegToken: Types.DeleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications =
  (): Types.SubscribeToPushNotifications => async () =>
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
