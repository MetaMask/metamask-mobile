import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Logger from '../../../util/Logger';
import { mmStorage } from '../settings';
import NotificationManager from '../../../core/NotificationManager';
import { parseNotification } from '../methods';

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
        permissionStatus === 1 || permissionStatus === 2
      ) {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          mmStorage.saveLocal('metaMaskFcmToken', { data: fcmToken });
        }
      }
    } catch (error) {
      Logger.log(error as Error, 'FCMService:: error saving');
    }
  };

  listenForMessagesForeground = (): UnsubscribeFunc => messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const notificationData = parseNotification(remoteMessage);
    NotificationManager.onMessageReceived(notificationData);
  });

  listenForMessagesBackground = (): void => {
    messaging().setBackgroundMessageHandler(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      const notificationData = parseNotification(remoteMessage);
      NotificationManager.onMessageReceived(notificationData);
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
}
export default new FCMService();
