import { NavigationContainerRef } from '@react-navigation/native';
import { useRegisterPushNotificationsEffect } from './useRegisterPushNotificationsEffect';

/**
 * Registers Push Notifications
 * TEMP - clean up props once we finalise integration
 * @param navigation - page navigation prop
 */
const useNotificationHandler = (_navigation: NavigationContainerRef) => {
  useRegisterPushNotificationsEffect();
};

export default useNotificationHandler;
