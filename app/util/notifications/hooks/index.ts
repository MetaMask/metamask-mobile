import { useCallback, useEffect } from 'react';

import notifee, {
  Event as NotifeeEvent,
  EventType,
} from '@notifee/react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

import Routes from '../../../constants/navigation/Routes';
import { setupAndroidChannel } from '../setupAndroidChannels';
import { Notification } from '../types';
import Device from '../../../util/device';
import { hasInitialNotification } from '../methods';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

const useNotificationHandler = (navigation: NavigationProp<ParamListBase>) => {
  const performActionBasedOnOpenedNotificationType = useCallback(
    async (notification: Notification) => {
      navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
        notification,
      });
    },
    [navigation],
  );

  const handleOpenedNotification = useCallback(
    (notification?: Notification) => {
      if (!notification) {
        return;
      }
      performActionBasedOnOpenedNotificationType(notification);
    },
    [performActionBasedOnOpenedNotificationType],
  );

  const handleNotificationPressed = useCallback(
    (event: NotifeeEvent) => {
      // eslint-disable-next-line no-console
      console.log(
        `[onForegroundEvent] notification id: ${
          event.detail.notification !== undefined
            ? event.detail.notification.id
            : 'undefined'
        },  event type: ${EventType[event.type]}${event.detail.pressAction}`,
      );
      if (event.type === EventType.PRESS) {
        handleOpenedNotification(event.detail.notification as Notification);
      }
    },
    [handleOpenedNotification],
  );

  useEffect(() => {
    if (!isNotificationsFeatureEnabled()) {
      return;
    }

    setTimeout(() => {
      if (Device.isAndroid()) {
        setupAndroidChannel();
        hasInitialNotification().then((res) => {
          if (res) {
            navigation.navigate(Routes.NOTIFICATIONS.VIEW);
          }
        });
      }
    }, 1000);

    return notifee.onForegroundEvent(handleNotificationPressed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
};

export default useNotificationHandler;
