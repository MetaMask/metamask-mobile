import {
  type INotification,
  processNotification,
  toRawOnChainNotification,
  type UnprocessedOnChainRawNotification,
} from '@metamask/notification-services-controller/notification-services';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { NativeModules, Platform } from 'react-native';
import Logger from '../../../util/Logger';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

async function getInitialNotification() {
  // Tried many different approaches, but @react-native-firebase setup is unable to hold and track the initial open intent from a push notification
  // Using a custom native module that stores the intent and returns "similiar-ish" data to the @react-native-firebase RemoteMessage
  if (Platform.OS === 'android') {
    const { NotificationModule } = NativeModules;
    const remoteMessage: FirebaseMessagingTypes.RemoteMessage | null =
      await NotificationModule.getInitialNotification();
    return remoteMessage;
  }

  const remoteMessage: FirebaseMessagingTypes.RemoteMessage | null =
    await messaging().getInitialNotification();
  return remoteMessage;
}

function analyticsTrackPushClickEvent(
  remoteMessage?: FirebaseMessagingTypes.RemoteMessage | null,
) {
  try {
    if (remoteMessage?.data?.data) {
      const rawData = JSON.parse(remoteMessage.data.data?.toString() ?? null);
      const kind = rawData?.kind ?? rawData?.data?.kind;

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PUSH_NOTIFICATION_CLICKED,
        )
          .addProperties({
            deeplink: remoteMessage?.data?.deeplink?.toString(),
            kind,
            data: rawData,
          })
          .build(),
      );
    }
  } catch {
    // Do Nothing
  }
}

type UnsubscribeFunc = () => void;

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

/**
 * Processes and handles a remote firebase message.
 * Currently firebase messages only support wallet notifications (from our notification services).
 * @param payload - Firebase Remote Message Payload.
 * @param handler - Callback handler for callers to handle a notification
 * @returns - void
 */
async function processAndHandleNotification(
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

    // If we are able to handle a remote push notification
    // Then we do not want to render the original server notification but custom content
    // Prevents duplicate notifications
    delete payload.notification;

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
  ): Promise<UnsubscribeFunc | null> => {
    try {
      // We only subscribe to foreground messages, as subscribing to background messages that contain `notification` + `data` payloads have issues
      // IOS - requires payload editing (https://notifee.app/react-native/docs/ios/remote-notification-support)
      // IOS - requires isHeadless injection and app modification to ship a minimal app when headless (https://rnfirebase.io/messaging/usage#background-application-state).
      // Android - will cause double notifications if a remote message contains both `notification` + `data` payloads
      // Firebase will still send push notifications in background + app kill as there is a `notification` payload in the remote message
      await this.#registerForegroundMessages(handler);
      return this.#hasRegisteredForeground;
    } catch {
      return null;
    }
  };

  isPushNotificationsEnabled = () => isPushNotificationsEnabled();

  /**
   * Ensures we only register for foreground notifications once
   */
  #hasRegisteredForeground: UnsubscribeFunc | null = null;
  #registerForegroundMessages = async (
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
        processAndHandleNotification(payload, handler);
      });
    } catch {
      // Do nothing
    }
  };

  /**
   * Used to clear any registered listeners.
   * Mostly used for tested cases
   */
  clearRegistration = () => {
    this.#hasRegisteredForeground?.();
    this.#hasRegisteredForeground = null;
  };

  onClickPushNotificationWhenAppClosed = async () => {
    try {
      const remoteMessage = await getInitialNotification();
      analyticsTrackPushClickEvent(remoteMessage);
      const deeplink = remoteMessage?.data?.deeplink?.toString();
      return deeplink;
    } catch {
      return null;
    }
  };

  onClickPushNotificationWhenAppSuspended = (
    deeplinkCallback: (deeplink?: string) => void,
  ) => {
    try {
      messaging().onNotificationOpenedApp((remoteMessage) => {
        try {
          analyticsTrackPushClickEvent(remoteMessage);
          const deeplink = remoteMessage?.data?.deeplink?.toString();
          deeplinkCallback(deeplink);
        } catch {
          // Do nothing
        }
      });
    } catch {
      // Do nothing
    }
  };
}
export default new FCMService();
