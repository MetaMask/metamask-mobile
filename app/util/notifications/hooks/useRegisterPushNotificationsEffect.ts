import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  INotification,
  TRIGGER_TYPES,
} from '@metamask/notification-services-controller/notification-services';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import NotificationsService from '../services/NotificationService';
import { PressActionId } from '../types';
import { useEffect } from 'react';

// TODO - improve navigation types, so we have Type-Safety for navigation props
type NavigationParams = Record<string, { notification: INotification }>;

// TODO - improve type inference for notifications we support
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

  // TODO, find a nicer way of abstracting the notifications we do support push notifications for
  if (notification.type === TRIGGER_TYPES.SNAP) {
    return;
  }

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
  const notificationData = notification.data;

  if (
    pressAction.id === PressActionId.OPEN_NOTIFICATIONS_VIEW &&
    isINotification(notificationData)
  ) {
    clickPushNotification(notificationData, navigation);
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
        const pressAction = event.detail.pressAction;
        const notificationData = notification?.data;

        if (
          pressAction?.id === PressActionId.OPEN_NOTIFICATIONS_VIEW &&
          isINotification(notificationData)
        ) {
          clickPushNotification(notificationData, navigation);
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

  // App Open Effect
  useEffect(() => {
    onAppOpenNotification(navigation);
  }, [navigation]);

  // On Background and Foreground Events
  useEffect(() => {
    onBackgroundEvent(navigation);
  }, [navigation]);
}
