import { useEffect } from 'react';
import notifee, {
  Event as NotifeeEvent,
  EventType,
} from '@notifee/react-native';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';
import { setupAndroidChannel } from '../setupAndroidChannels';
import { SimpleNotification } from '../types';

const useNotificationHandler = (
  bootstrapAndroidInitialNotification: () => Promise<void>,
  navigation: any,
) => {
  const performActionBasedOnOpenedNotificationType = async (
    notification: SimpleNotification,
  ) => {
    const { data } = notification;

    if (data && data.action === 'tx') {
      if (data.id) {
        NotificationManager.setTransactionToView(data.id);
      }
      if (navigation) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    }
  };

  const handleOpenedNotification = (notification?: SimpleNotification) => {
    if (!notification) {
      return;
    }
    performActionBasedOnOpenedNotificationType(notification);
  };

  const handleNotificationPressed = (event: NotifeeEvent) => {
    if (event.type === EventType.PRESS) {
      handleOpenedNotification(event.detail.notification);
    }
  };

  useEffect(() => {
    // Reset badge count https://notifee.app/react-native/docs/ios/badges#removing-the-badge-count
    notifee.setBadgeCount(0);

    bootstrapAndroidInitialNotification();
    setTimeout(() => {
      notifee.onForegroundEvent(handleNotificationPressed);

      setupAndroidChannel();
    }, 1000);
  }, [bootstrapAndroidInitialNotification, navigation]);
};

export default useNotificationHandler;
