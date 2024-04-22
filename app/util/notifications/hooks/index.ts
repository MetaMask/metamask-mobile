import { useEffect } from 'react';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import Device from '../../../util/device';
import { STORAGE_IDS } from '../../../util/notifications/settings/storage/constants';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';

const useNotificationHandler = (
  bootstrapInitialNotification: () => Promise<void>,
  navigation: any,
) => {
  useEffect(() => {
    notifee.decrementBadgeCount(1);

    bootstrapInitialNotification();
    setTimeout(() => {
      notifee.onForegroundEvent(
        ({ type, detail }: { type: any; detail: any }) => {
          if (type !== EventType.DISMISSED) {
            let data = null;
            if (Device.isAndroid()) {
              if (detail.notification.data) {
                data = JSON.parse(detail.notification.data);
              }
            } else if (detail.notification.data) {
              data = detail.notification.data;
            }
            if (data && data.action === 'tx') {
              if (data.id) {
                NotificationManager.setTransactionToView(data.id);
              }
              if (navigation) {
                navigation.navigate(Routes.TRANSACTIONS_VIEW);
              }
            }
          }
        },
      );
      /**
       * Creates a channel (required for Android)
       */
      notifee.createChannel({
        id: STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID,
        name: 'Default',
        importance: AndroidImportance.HIGH,
      });
    }, 1000);
  }, [bootstrapInitialNotification, navigation]);
};

export default useNotificationHandler;
