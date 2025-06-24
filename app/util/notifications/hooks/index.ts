import { useRegisterPushNotificationsEffect } from './useRegisterPushNotificationsEffect';
import { useStartupNotificationsEffect } from './useStartupNotificationsEffect';

/**
 * Registers Push Notifications and lists notifications on startup.
 */
const useNotificationHandler = () => {
  useRegisterPushNotificationsEffect();
  useStartupNotificationsEffect();
};

export default useNotificationHandler;
