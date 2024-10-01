import { useCallback, useEffect } from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '@util/notifications/services/NotificationService';
import Routes from '@constants/navigation/Routes';
import {
  isNotificationsFeatureEnabled,
  TRIGGER_TYPES,
} from '@util/notifications';
import { Notification } from '@util/notifications/types';
import { Linking } from 'react-native';

const useNotificationHandler = (navigation: NavigationProp<ParamListBase>) => {
  const performActionBasedOnOpenedNotificationType = useCallback(
    async (notification: Notification) => {
      if (
        notification.type === TRIGGER_TYPES.FEATURES_ANNOUNCEMENT &&
        notification.data.externalLink
      ) {
        Linking.openURL(notification.data.externalLink.externalLinkUrl);
      } else {
        navigation.navigate(Routes.NOTIFICATIONS.DETAILS, {
          notificationId: notification.id,
        });
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
    if (!isNotificationsFeatureEnabled()) return;

    const unsubscribeForegroundEvent = NotificationsService.onForegroundEvent(
      async ({ type, detail }) =>
        await NotificationsService.handleNotificationEvent({
          type,
          detail,
          callback: handlePressedNotification,
        }),
    );

    NotificationsService.onBackgroundEvent(
      async ({ type, detail }) =>
        await NotificationsService.handleNotificationEvent({
          type,
          detail,
          callback: handlePressedNotification,
        }),
    );

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
