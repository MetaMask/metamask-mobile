import { useCallback, useEffect } from 'react';
import notifee, {
  Event as NotifeeEvent,
  EventType,
} from '@notifee/react-native';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';
import { setupAndroidChannel } from '../setupAndroidChannels';
import { SimpleNotification } from '../types';
import Device from '../../../util/device';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const useNotificationHandler = (
  bootstrapAndroidInitialNotification: () => Promise<void>,
  navigation: NavigationProp<ParamListBase>,
) => {
  const performActionBasedOnOpenedNotificationType = useCallback(
    async (notification: SimpleNotification) => {
      const { data } = notification;

      if (data && data.action === 'tx') {
        if (data.id) {
          NotificationManager.setTransactionToView(data.id);
        }
        if (navigation) {
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        }
      } else {
        navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      }
    },
    [navigation],
  );

  const handleOpenedNotification = useCallback(
    (notification?: SimpleNotification) => {
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
        handleOpenedNotification(event.detail.notification);
      }
    },
    [handleOpenedNotification],
  );

  useEffect(() => {
    bootstrapAndroidInitialNotification();
    setTimeout(() => {
      if (Device.isAndroid()) {
        setupAndroidChannel();
      }
      notifee.onForegroundEvent(handleNotificationPressed);
    }, 1000);
  }, [
    bootstrapAndroidInitialNotification,
    navigation,
    handleNotificationPressed,
  ]);
};

export default useNotificationHandler;
