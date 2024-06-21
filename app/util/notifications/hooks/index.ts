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

const useNotificationHandler = (
  bootstrapAndroidInitialNotification: () => Promise<void>,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any,
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
    // Reset badge count https://notifee.app/react-native/docs/ios/badges#removing-the-badge-count
    notifee.setBadgeCount(0);

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
