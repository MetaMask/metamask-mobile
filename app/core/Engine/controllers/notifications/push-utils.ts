import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { createNotificationMessage } from './create-push-message';
import { logPushEvent } from '../../../../util/notifications/pushDebugLog';

export const createRegToken = FCMService.createRegToken;
export const deleteRegToken = FCMService.deleteRegToken;

export const createSubscribeToPushNotifications = () => async () =>
  FCMService.listenToPushNotificationsReceived(
    async (notification) => {
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
    },
    async (rawPayload) => {
      // Platform notifications don't have data.data — display using the raw
      // notification title/body that Firebase would normally show in background/killed.
      const title = rawPayload.notification?.title;
      const body = rawPayload.notification?.body;
      logPushEvent(
        'FCM_PLATFORM_HANDLER_CALLED',
        `Platform handler invoked — title: "${title ?? '(none)'}"`,
        { title, body, dataKeys: Object.keys(rawPayload.data ?? {}) },
      );
      if (!title) {
        logPushEvent(
          'FCM_PLATFORM_HANDLER_NO_TITLE',
          'No title in notification payload — skipped',
        );
        return;
      }
      await NotificationsService.displayNotification({
        pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
        title,
        body,
        data: rawPayload.data,
      });
      logPushEvent(
        'FCM_PLATFORM_HANDLER_DISPLAYED',
        `Platform notification displayed: "${title}"`,
      );
    },
  );

export const isPushNotificationsEnabled = FCMService.isPushNotificationsEnabled;
