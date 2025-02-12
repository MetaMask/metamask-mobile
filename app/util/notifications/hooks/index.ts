import { useCallback, useEffect } from 'react';
import {
  INotification,
  TRIGGER_TYPES,
} from '@metamask/notification-services-controller/notification-services';

import { useSelector } from 'react-redux';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

import FCMService from '../services/FCMService';
import NotificationsService from '../services/NotificationService';
import { selectIsMetamaskNotificationsEnabled } from '../../../selectors/notifications';
import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const useNotificationHandler = (navigation: NavigationContainerRef) => {
  /**
   * Handles the action based on the type of notification (sent from the backend & following Notification types) that is opened
   * @param notification - The notification that is opened
   */

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const handleNotificationCallback = useCallback(
    async (notification: INotification) => {
      if (!notification) {
        return;
      }
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

  const notificationEnabled =
    isNotificationsFeatureEnabled() && isNotificationEnabled;

  useEffect(() => {
    if (!notificationEnabled) return;

    // Firebase Cloud Messaging
    FCMService.registerAppWithFCM();
    FCMService.saveFCMToken();
    FCMService.getFCMToken();
    FCMService.listenForMessagesBackground();

    // Notifee
    NotificationsService.onBackgroundEvent(
      async ({ type, detail }) =>
        await NotificationsService.handleNotificationEvent({
          type,
          detail,
          callback: handleNotificationCallback,
        }),
    );

    const unsubscribeForegroundEvent = FCMService.listenForMessagesForeground();

    return () => {
      unsubscribeForegroundEvent();
    };
  }, [handleNotificationCallback, notificationEnabled]);
};

export default useNotificationHandler;
