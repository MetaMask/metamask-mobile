import { toPushAnalyticsPayload } from '@metamask/notification-services-controller/push-services';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { NativeModules, Platform } from 'react-native';
import Logger from '../../../util/Logger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../analytics/analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { toFcmDataStringRecord } from '../utils/fcm-data';

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

async function analyticsTrackPushClickEvent(
  remoteMessage?: FirebaseMessagingTypes.RemoteMessage | null,
) {
  try {
    const data = toFcmDataStringRecord(remoteMessage?.data);
    const payload = toPushAnalyticsPayload(data);

    const properties = payload
      ? {
          ...payload,
        }
      : { ...(data?.deeplink && { deeplink: data.deeplink }) };

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PUSH_NOTIFICATION_CLICKED,
      )
        .addProperties(properties)
        .build(),
    );
  } catch {
    // Do Nothing
  }
}

type UnsubscribeFunc = () => void;

/**
 * A notification tap, and what the payload carried with it. `opened` is true
 * even when there is no deeplink — on-chain activity notifications commonly
 * have no CTA link.
 */
export interface PushTapResult {
  opened: boolean;
  deeplink: string | null;
  notificationType?: string;
  notificationSubtype?: string;
}

function toPushTapResult(
  remoteMessage?: FirebaseMessagingTypes.RemoteMessage | null,
): PushTapResult {
  const data = toFcmDataStringRecord(remoteMessage?.data);
  const payload = toPushAnalyticsPayload(data);
  return {
    opened: Boolean(remoteMessage),
    deeplink: data?.deeplink ?? null,
    notificationType: payload?.notification_type,
    notificationSubtype: payload?.notification_subtype,
  };
}

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
   * Listener for foreground push notifications.
   * Background/killed state is handled natively by the OS from the FCM notification payload.
   * @returns unsubscribe handler
   */
  listenToPushNotificationsReceived = async (
    handler: (
      rawPayload: FirebaseMessagingTypes.RemoteMessage,
    ) => void | Promise<void>,
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
    handler: (
      rawPayload: FirebaseMessagingTypes.RemoteMessage,
    ) => void | Promise<void>,
  ) => {
    if (!(await isPushNotificationsEnabled())) {
      return null;
    }

    if (this.#hasRegisteredForeground) {
      return;
    }

    try {
      const unsubscribeOnMessage = messaging().onMessage(handler);

      const unsubscribeForegroundMessages = () => {
        try {
          unsubscribeOnMessage();
        } finally {
          if (this.#hasRegisteredForeground === unsubscribeForegroundMessages) {
            this.#hasRegisteredForeground = null;
          }
        }
      };

      this.#hasRegisteredForeground = unsubscribeForegroundMessages;
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

  /**
   * @returns `opened` — whether a notification tap launched the app, which is
   * true even when the payload carries no deeplink (common for on-chain
   * activity notifications) — and the deeplink when one is present.
   */
  onClickPushNotificationWhenAppClosed = async (): Promise<PushTapResult> => {
    try {
      const remoteMessage = await getInitialNotification();
      await analyticsTrackPushClickEvent(remoteMessage);
      return toPushTapResult(remoteMessage);
    } catch {
      return { opened: false, deeplink: null };
    }
  };

  onClickPushNotificationWhenAppSuspended = (
    tapCallback: (tap: PushTapResult) => void,
  ) => {
    try {
      messaging().onNotificationOpenedApp(async (remoteMessage) => {
        try {
          await analyticsTrackPushClickEvent(remoteMessage);
          tapCallback(toPushTapResult(remoteMessage));
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
