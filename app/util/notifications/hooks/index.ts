import { useRegisterPushNotificationsEffect } from './useRegisterPushNotificationsEffect';
import { useListNotificationsEffect } from './useNotifications';

/**
 * Registers Push Notifications and lists notifications on startup.
 */
const useNotificationHandler = () => {
  useRegisterPushNotificationsEffect();
  useListNotificationsEffect();
};

export default useNotificationHandler;
