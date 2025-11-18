import { useStartupNotificationsEffect } from './useStartupNotificationsEffect';

/**
 * Lists notifications on startup.
 */
const useNotificationHandler = () => {
  useStartupNotificationsEffect();
};

export default useNotificationHandler;
