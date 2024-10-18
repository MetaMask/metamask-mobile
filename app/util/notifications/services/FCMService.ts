import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Logger from '../../../util/Logger';
import NotificationsService from './NotificationService';
import { ChannelId } from '../../../util/notifications/androidChannels';
import { mmStorage } from '../settings';
import { strings } from '../../../../locales/i18n';

type UnsubscribeFunc = () => void

class FCMService {

  getFCMToken = async (): Promise<string | undefined> => {
    const fcmTokenLocal = await mmStorage.getLocal('metaMaskFcmToken');
    const token = fcmTokenLocal?.data || undefined;

    if (!token) {
      Logger.log('getFCMToken: No FCM token found');
    }
    return token;
  };

  saveFCMToken = async () => {
    try {
      const permissionStatus = await messaging().hasPermission();
      if (
        permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
      ) {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          mmStorage.saveLocal('metaMaskFcmToken', { data: fcmToken });
        }
      }
    } catch (error) {
      Logger.error(error as Error);
    }
  };

  registerTokenRefreshListener = () =>
    messaging().onTokenRefresh((fcmToken: string) => {
      mmStorage.saveLocal('metaMaskFcmToken', { data: fcmToken });
  });

  listenForMessagesForeground = (): UnsubscribeFunc => messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      Logger.log('A new FCM message arrived!', remoteMessage);

      await NotificationsService.displayNotification({
        channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
        title: remoteMessage.notification?.title || strings('notifications.default_message_title'),
        body: remoteMessage.notification?.body || strings('notifications.default_message_description'),
      });
    });

  listenForMessagesBackground = (): void => {
    messaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      Logger.log('A new FCM message arrived in background', remoteMessage);

      await NotificationsService.displayNotification({
        channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
        title: remoteMessage.notification?.title || strings('notifications.default_message_title'),
        body: remoteMessage.notification?.body || strings('notifications.default_message_description'),
      });
    });
  };

  registerAppWithFCM = async () => {
    Logger.log(
      'registerAppWithFCM status',
      messaging().isDeviceRegisteredForRemoteMessages,
    );
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging()
        .registerDeviceForRemoteMessages()
        .then((status: unknown) => {
          Logger.log('registerDeviceForRemoteMessages status', status);
        })
        .catch((error: Error) => {
          Logger.error(error);
        });
    }
  };

  unRegisterAppWithFCM = async () => {
    Logger.log(
      'unRegisterAppWithFCM status',
      messaging().isDeviceRegisteredForRemoteMessages,
    );

    if (messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging()
        .unregisterDeviceForRemoteMessages()
        .then((status: unknown) => {
          Logger.log('unregisterDeviceForRemoteMessages status', status);
        })
        .catch((error: Error) => {
          Logger.error(error);
        });
    }
    await messaging().deleteToken();
    Logger.log(
      'unRegisterAppWithFCM status',
      messaging().isDeviceRegisteredForRemoteMessages,
    );
  };
}
export default new FCMService();
