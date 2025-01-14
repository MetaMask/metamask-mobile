import type {
  Types,
  NotificationServicesPushControllerMessenger,
} from '@metamask/notification-services-controller/push-services';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { ChannelId } from '../../../../util/notifications';
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
            channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
            title: notificationMessage.title,
            body: notificationMessage.description,
            data: notification,
          });
        },
      );

    // TODO - Find out how to handle clicking notifications in the background.
    // The only approach notifee + navigate offers is through React.

    const unsubscribe = () => {
      onReceiveNotificationSub?.();
    };

    return unsubscribe;
  };
