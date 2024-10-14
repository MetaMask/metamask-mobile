import { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import Routes from '../../../constants/navigation/Routes';
import {
  TRIGGER_TYPES,
} from '../../../util/notifications';
import { Notification } from '../../../util/notifications/types';


const useNotificationHandler = (navigation: NavigationProp<ParamListBase>) => {
  const performActionBasedOnOpenedNotificationType = useCallback(
    async (notification: Notification) => {
      if (
        notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT &&
        notification.data.externalLink
      ) {
        Linking.openURL(notification.data.externalLink.externalLinkUrl);
      } else {
        navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      }
    },
    [navigation],
  );

  const handlePressedNotification = useCallback(
    (notification?: Notification) => {
      if (!notification) {
        return;
      }
      performActionBasedOnOpenedNotificationType(notification);
    },
    [performActionBasedOnOpenedNotificationType],
  );

  useEffect(() => {
    NotificationsService.onAppBootstrap();
  }, []);

  useEffect(() => {
    const unsubscribeForegroundEvent = messaging().onMessage(async (remoteMessage: any) => {
      await NotificationsService.handleNotificationEvent({
        type: 'foreground',
        detail: remoteMessage,
        callback: handlePressedNotification
      });
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      await NotificationsService.handleNotificationEvent({
        type: 'background',
        detail: remoteMessage,
        callback: handlePressedNotification
      });
    });

    return () => {
      unsubscribeForegroundEvent();
    };
  }, [handlePressedNotification]);

  return {
    performActionBasedOnOpenedNotificationType,
    handlePressedNotification,
  };
};

export default useNotificationHandler;
