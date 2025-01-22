import type {
  Types,
  NotificationServicesPushControllerMessenger,
} from '@metamask/notification-services-controller/push-services';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './get-notification-message';

export const createRegToken: Types.CreateRegToken = FCMService.createRegToken;
export const deleteRegToken: Types.DeleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications =
  (props: {
    messenger: NotificationServicesPushControllerMessenger;
  }): Types.SubscribeToPushNotifications =>
  async () => {
    const onReceiveNotificationSub =
      await FCMService.listenToPushNotificationsReceived(
        async (notification) => {
          props.messenger.publish(
            'NotificationServicesPushController:onNewNotifications',
            notification,
          );

          const notificationMessage = createNotificationMessage(notification);
          if (!notificationMessage) {
            return;
          }

          await NotificationsService.displayNotification({
            pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
            title: notificationMessage.title,
            body: notificationMessage.description,
            data: notification,
          });
        },
      );

    const unsubscribe = () => {
      onReceiveNotificationSub?.();
    };

    return unsubscribe;
  };
