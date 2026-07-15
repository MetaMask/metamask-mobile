import {
  type INotification,
  processNotification,
  type UnprocessedRawNotification,
  toRawAPINotification,
  OnChainRawNotification,
} from '@metamask/notification-services-controller/notification-services';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { NativeModules, Platform } from 'react-native';
import Logger from '../../../util/Logger';
import { logPushEvent } from '../pushDebugLog';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../analytics/analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import type { JsonValue } from '../../../core/Analytics/MetaMetrics.types';

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
    const extractData = () => {
      try {
        // On Chain Raw Notification Shape
        if (remoteMessage?.data?.data) {
          const rawData: OnChainRawNotification | null = JSON.parse(
            remoteMessage.data.data?.toString() ?? null,
          );
          return {
            kind: [
              rawData?.payload.data.kind,
              rawData?.type,
              rawData?.notification_type,
              'wallet_activity',
            ].find((kind) => Boolean(kind)),
            rawData,
          };
        }

        // Generic Platform Notification
        if (remoteMessage?.data?.metadata) {
          interface PlatformNotificationMetadata {
            kind?: string;
            [otherProps: string]: JsonValue;
          }
          const rawData: PlatformNotificationMetadata | null = JSON.parse(
            remoteMessage.data.metadata?.toString() ?? null,
          );

          return {
            kind: [rawData?.kind, rawData?.type, 'platform']
              .filter((x): x is string => typeof x === 'string')
              .find((kind) => Boolean(kind)),
            rawData,
          };
        }
      } catch {
        return null;
      }
    };

    const remoteMessageParsedData = extractData();

    // Always send a push notification click event, but properties are optional
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PUSH_NOTIFICATION_CLICKED,
      )
        .addProperties({
          deeplink: remoteMessage?.data?.deeplink?.toString(),
          notification_type: remoteMessageParsedData?.kind,
          data: remoteMessageParsedData?.rawData,
        })
        .build(),
    );
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
  platformHandler?: (
    rawPayload: FirebaseMessagingTypes.RemoteMessage,
  ) => void | Promise<void>,
) {
  try {
    const payloadData = payload?.data?.data
      ? String(payload?.data?.data)
      : undefined;
    const data: UnprocessedRawNotification | undefined = payloadData
      ? JSON.parse(payloadData)
      : undefined;

    if (!data) {
      logPushEvent(
        'FCM_FOREGROUND_NO_DATA',
        'Foreground message received but no data.data — dropped',
        {
          hasNotificationPayload: Boolean(payload.notification),
          dataKeys: Object.keys(payload.data ?? {}),
        },
      );
      await platformHandler?.(payload);
      return;
    }

    // If we are able to handle a remote push notification
    // Then we do not want to render the original server notification but custom content
    // Prevents duplicate notifications
    delete payload.notification;

    const notificationData = toRawAPINotification(data);
    const notification = processNotification(notificationData);
    logPushEvent(
      'FCM_FOREGROUND_PROCESSING',
      `Foreground notification parsed: ${notification?.id}`,
      { id: notification?.id },
    );
    await handler(notification);
    logPushEvent(
      'FCM_FOREGROUND_DISPLAYED',
      `Notification displayed: ${notification?.id}`,
    );
  } catch (error) {
    logPushEvent('FCM_FOREGROUND_ERROR', 'processAndHandleNotification threw', {
      error: String(error),
    });
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
      logPushEvent(
        'FCM_TOKEN_CREATED',
        `Token registered (last 8): ...${fcmToken.slice(-8)}`,
      );
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
    platformHandler?: (
      rawPayload: FirebaseMessagingTypes.RemoteMessage,
    ) => void | Promise<void>,
  ): Promise<UnsubscribeFunc | null> => {
    try {
      // We only subscribe to foreground messages, as subscribing to background messages that contain `notification` + `data` payloads have issues
      // IOS - requires payload editing (https://notifee.app/react-native/docs/ios/remote-notification-support)
      // IOS - requires isHeadless injection and app modification to ship a minimal app when headless (https://rnfirebase.io/messaging/usage#background-application-state).
      // Android - will cause double notifications if a remote message contains both `notification` + `data` payloads
      // Firebase will still send push notifications in background + app kill as there is a `notification` payload in the remote message
      logPushEvent('FCM_SETUP', 'listenToPushNotificationsReceived called', {
        hasPlatformHandler: Boolean(platformHandler),
      });
      await this.#registerForegroundMessages(handler, platformHandler);
      logPushEvent(
        'FCM_SETUP',
        `#registerForegroundMessages finished — hasRegisteredForeground: ${Boolean(
          this.#hasRegisteredForeground,
        )}`,
      );
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
    platformHandler?: (
      rawPayload: FirebaseMessagingTypes.RemoteMessage,
    ) => void | Promise<void>,
  ) => {
    if (!(await isPushNotificationsEnabled())) {
      logPushEvent(
        'FCM_FOREGROUND_ERROR',
        'registerForegroundMessages aborted — isPushNotificationsEnabled() is false (no OS permission)',
      );
      return null;
    }

    if (this.#hasRegisteredForeground) {
      return;
    }

    try {
      this.#hasRegisteredForeground = messaging().onMessage(async (payload) => {
        logPushEvent(
          'FCM_FOREGROUND_RECEIVED',
          'onMessage fired (app in foreground)',
          {
            hasNotification: Boolean(payload.notification),
            hasDataData: Boolean(payload?.data?.data),
            dataKeys: Object.keys(payload.data ?? {}),
          },
        );
        processAndHandleNotification(payload, handler, platformHandler);
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
      if (remoteMessage) {
        logPushEvent(
          'FCM_OPENED_FROM_KILLED',
          'App opened from a notification (was killed)',
          { hasDataData: Boolean(remoteMessage?.data?.data) },
        );
      }
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
          logPushEvent(
            'FCM_OPENED_FROM_BACKGROUND',
            'App opened from a notification (was backgrounded)',
            { hasDataData: Boolean(remoteMessage?.data?.data) },
          );
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
