import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { INotification } from '@metamask/notification-services-controller/notification-services';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import NotificationsService from '../services/NotificationService';
import { PressActionId } from '../types';
import { useEffect } from 'react';
import { isNotificationsFeatureEnabled } from '../constants';
import { useSelector } from 'react-redux';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../selectors/notifications';

type NavigationParams = Record<string, { notification: INotification }>;

function isINotification(n: unknown): n is INotification {
  const assumedShape = n as INotification;
  return Boolean(assumedShape?.type) && Boolean(assumedShape?.data);
}

/**
 * Logic for handling a push notification click.
 * It will publish an event, and attempt navigation to notifications view
 * @param notification - notification click received from App Start or Background
 * @param navigation - navigation prop for page navigations
 * @returns - void
 */
function clickPushNotification(
  notification: INotification,
  navigation: NavigationProp<NavigationParams>,
) {
  // Publish Click Event
  Engine.controllerMessenger.publish(
    'NotificationServicesPushController:pushNotificationClicked',
    notification,
  );

  // Navigate
  navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
    notification,
  });
}

/**
 * Android Devices use a `getInitialNotifications` if a push notification cold-starts the application.
 * @param navigation - navigation prop for page navigations
 * @returns - void
 */
async function onAppOpenNotification(
  navigation: NavigationProp<NavigationParams>,
) {
  const initialNotification =
    await NotificationsService.getInitialNotification();
  if (!initialNotification) {
    return;
  }

  const { notification, pressAction } = initialNotification;
  const notificationDataStr = notification?.data?.dataStr;

  if (!notificationDataStr) {
    return;
  }

  try {
    // Notify can only store strings
    const notificationData = JSON.parse(notificationDataStr as string);
    if (
      pressAction?.id === PressActionId.OPEN_NOTIFICATIONS_VIEW &&
      isINotification(notificationData)
    ) {
      clickPushNotification(notificationData, navigation);
    }
  } catch {
    // Do Nothing
  }
}

/**
 * IOS/Anroid devices will use a notifee `backgroundEvent` if a push notification is delivered and clicked on a minimised app.
 * (IOS also uses this for cold-starts).
 * @param navigation - navigation prop used for page navigations
 */
async function onBackgroundEvent(navigation: NavigationProp<NavigationParams>) {
  NotificationsService.onBackgroundEvent((event) =>
    NotificationsService.handleNotificationEvent({
      ...event,
      callback: (notification) => {
        const pressAction = event?.detail?.pressAction;
        const notificationDataStr = notification?.data?.dataStr;

        if (!notificationDataStr) {
          return;
        }

        try {
          // Notify can only store strings
          const notificationData = JSON.parse(notificationDataStr as string);
          if (
            pressAction?.id === PressActionId.OPEN_NOTIFICATIONS_VIEW &&
            isINotification(notificationData)
          ) {
            clickPushNotification(notificationData, navigation);
          }
        } catch {
          // Do Nothing
        }
      },
    }),
  );
}

/**
 * Effect that registers Notifee Push listeners
 * - When push notifications are recieved
 * - When push notifications are clicked
 */
export function useRegisterPushNotificationsEffect() {
  const navigation: NavigationProp<NavigationParams> = useNavigation();
  const notificationsFlagEnabled = isNotificationsFeatureEnabled();
  const notificationsControllerEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const notificationsPushControllerEnabled = useSelector(
    selectIsMetaMaskPushNotificationsEnabled,
  );
  const notificationsEnabled =
    notificationsFlagEnabled &&
    notificationsControllerEnabled &&
    notificationsPushControllerEnabled;

  // App Open Effect
  useEffect(() => {
    const run = async () => {
      try {
        if (notificationsEnabled) {
          await onAppOpenNotification(navigation);
        }
      } catch {
        // Do Nothing
      }
    };
    run();
  }, [navigation, notificationsEnabled]);

  // On Background and Foreground Events
  useEffect(() => {
    const run = async () => {
      try {
        if (notificationsEnabled) {
          await onBackgroundEvent(navigation);
        }
      } catch {
        // Do Nothing
      }
    };
    run();
  }, [navigation, notificationsEnabled]);
}
