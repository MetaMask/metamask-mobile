import { useEffect } from 'react';

import { useSelector } from 'react-redux';
import {
  isNotificationsFeatureEnabled,
} from '../../../util/notifications';

import FCMService from '../services/FCMService';
import { selectIsMetamaskNotificationsEnabled } from '../../../selectors/notifications';

const useNotificationHandler = () => {
  /**
   * Handles the action based on the type of notification (sent from the backend & following Notification types) that is opened
   * @param notification - The notification that is opened
   */

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const notificationEnabled = isNotificationsFeatureEnabled() || isNotificationEnabled;

  useEffect(() => {
    if (!notificationEnabled) return;
    FCMService.registerAppWithFCM();
    FCMService.saveFCMToken();
    const unsubscribeRegisterTokenRefreshListener = FCMService.registerTokenRefreshListener();
    const unsubscribeForegroundEvent = FCMService.listenForMessagesForeground();

    return () => {
        unsubscribeForegroundEvent();
        unsubscribeRegisterTokenRefreshListener();
    };
  }, [notificationEnabled]);
};

export default useNotificationHandler;
