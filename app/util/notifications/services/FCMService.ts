import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {
  type INotification,
  type UnprocessedOnChainRawNotification,
  toRawOnChainNotification,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import Logger from '../../../util/Logger';

type Unsubscribe = () => void;

/**
 * Utility to check if devices have enabled push notifications
 * @returns boolean
 */
async function isPushNotificationsEnabled() {
  try {
    const permissionStatus = await messaging().hasPermission();
    return (
      permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
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
   * Ensures we only register for background notifications once
   */
  #hasRegisteredBackground = false;

  /**
   * Ensures we only register for foreground notifications once
   */
  #hasRegisteredForeground: Unsubscribe | null = null;

  /**
   * Listener for when push notifications are received.
   * Subscribed to both foreground and background messages

   * @param handler - handler used for displaying push notifications. Must be provided.
   * @returns unsubscribe handler
   */
  listenToPushNotificationsReceived = async (
    handler: (notification: INotification) => void | Promise<void>,
  ): Promise<Unsubscribe | null> => {
    try {
      await this.registerBackgroundMessages(handler);
      await this.registerForegroundMessages(handler);
      return this.#hasRegisteredForeground;
    } catch {
      return null;
    }
  };

  /**
   * The `setBackgroundMessageHandler` must be called outside of our application as early as possible
   */
  registerBackgroundMessages = async (
    handler: (notification: INotification) => void | Promise<void>,
  ) => {
    if (!(await isPushNotificationsEnabled())) {
      return null;
    }

    if (this.#hasRegisteredBackground) {
      return;
    }

    try {
      messaging().setBackgroundMessageHandler(async (payload) => {
        notificationHandler(payload, handler);
      });
      this.#hasRegisteredBackground = true;
    } catch {
      // Do nothing
    }
  };

  registerForegroundMessages = async (
    handler: (notification: INotification) => void | Promise<void>,
  ) => {
    if (!(await isPushNotificationsEnabled())) {
      return null;
    }

    if (this.#hasRegisteredForeground) {
      return;
    }

    try {
      this.#hasRegisteredForeground = messaging().onMessage(async (payload) => {
        notificationHandler(payload, handler);
      });
    } catch {
      // Do nothing
    }
  };

  isPushNotificationsEnabled = () => isPushNotificationsEnabled();
}
export default new FCMService();
