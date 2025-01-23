import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {
  type INotification,
  type UnprocessedOnChainRawNotification,
  toRawOnChainNotification,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import Logger from '../../../util/Logger';
import { mmStorage } from '../settings';

type UnsubscribeFunc = () => void;

/**
 * Utility to check if devices have enabled push notifications
 * @returns boolean
 */
async function isPushNotificationsEnabled() {
  try {
    const permissionStatus = await messaging().hasPermission();
    return (
      permissionStatus ===
        FirebaseMessagingTypes.AuthorizationStatus.AUTHORIZED ||
      permissionStatus ===
        FirebaseMessagingTypes.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * IOS requires device registration for remote messages through APNs.
 * To be invoked when creating or registering FCM tokens.
 */
async function registerForRemoteMessages() {
  try {
    const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
    if (!isRegistered) {
      await messaging().registerDeviceForRemoteMessages();
    }
  } catch (error) {
    // Do Nothing - silently fail
  }
}

async function notificationHandler(
  payload: FirebaseMessagingTypes.RemoteMessage,
  handler: (notification: INotification) => void | Promise<void>,
) {
  try {
    const payloadData = payload?.data?.data
      ? String(payload?.data?.data)
      : undefined;
    const data: UnprocessedOnChainRawNotification | undefined = payloadData
      ? JSON.parse(payloadData)
      : undefined;

    if (!data) {
      return;
    }

    const notificationData = toRawOnChainNotification(data);
    const notification = processNotification(notificationData);
    await handler(notification);
  } catch (error) {
    // Do Nothing, cannot parse a bad notification
    Logger.log('Unable to send push notification:', {
      notification: payload?.data?.data,
      error,
    });
  }
}

/**
 * Service that provides an interface used for `NotificationServicesPushController`
 */
class FCMService {
  /**
   * Creates a registration token for Firebase Cloud Messaging
   *
   * @returns A promise that resolves with the registration token, or null if an error occurs
   */
  createRegToken = async (): Promise<string | null> => {
    if (!(await isPushNotificationsEnabled())) {
      return null;
    }

    try {
      await registerForRemoteMessages();
      const fcmToken = await messaging().getToken();
      return fcmToken;
    } catch {
      return null;
    }
  };

  /**
   * Deletes the Firebase Cloud Messaging registration token.
   *
   * @returns A promise that resolves with true if the token was successfully deleted, false otherwise.
   */
  deleteRegToken = async (): Promise<boolean> => {
    if (!(await isPushNotificationsEnabled())) {
      return true;
    }

    try {
      await messaging().deleteToken();
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Listener for when push notifications are received.
   * Subscribed to both foreground and background messages

   * @param handler - handler used for displaying push notifications. Must be provided.
   * @returns unsubscribe handler
   */
  listenToPushNotificationsReceived = async (
    handler: (notification: INotification) => void | Promise<void>,
  ): Promise<(() => void) | null> => {
    try {
      await messaging().setBackgroundMessageHandler((payload) =>
        notificationHandler(payload, handler),
      );
      // TODO - determine if there is value with foreground messages
      const unsubscribe = await messaging().onMessage((payload) =>
        notificationHandler(payload, handler),
      );
      return unsubscribe;
    } catch {
      return null;
    }
  };

  isPushNotificationsEnabled = () => isPushNotificationsEnabled();

  /**
   * @todo - delete this, it is not used anymore
   */
  getFCMToken = async (): Promise<string | undefined> => {
    const fcmTokenLocal = await mmStorage.getLocal('metaMaskFcmToken');
    const token = fcmTokenLocal?.data || undefined;
    if (!token) {
      Logger.log('getFCMToken: No FCM token found');
    }
    return token;
  };

  /**
   * @todo - delete this, it is not used anymore
   */
  saveFCMToken = async () => {
    try {
      const permissionStatus = await messaging().hasPermission();
      if (permissionStatus === 1 || permissionStatus === 2) {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          mmStorage.saveLocal('metaMaskFcmToken', { data: fcmToken });
        }
      }
    } catch (error) {
      Logger.log(error as Error, 'FCMService:: error saving');
    }
  };

  /**
   * @todo - delete this, it is not used anymore
   */
  listenForMessagesForeground = (): UnsubscribeFunc => () => {
    /* NO-OP */
  };

  /**
   * @todo - delete this, it is not used anymore
   */
  listenForMessagesBackground = (): void => {
    // No-Op
  };

  /**
   * @todo - delete this, it is not used anymore
   */
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
