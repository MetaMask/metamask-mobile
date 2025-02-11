import { NavigationContainerRef } from '@react-navigation/native';
import { useRegisterPushNotificationsEffect } from './useRegisterPushNotificationsEffect';

/**
 * Registers Push Notifications
 * @todo - clean up props once we finalise integration
 * @param navigation - page navigation prop
 */
const useNotificationHandler = (_navigation: NavigationContainerRef) => {
  useRegisterPushNotificationsEffect();
};

export default useNotificationHandler;
