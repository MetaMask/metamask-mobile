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
  }, []);
};

export default useNotificationHandler;

