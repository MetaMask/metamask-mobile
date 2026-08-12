import { useStartupNotificationsEffect } from './useStartupNotificationsEffect';
import { useNotificationOsPermissionEffect } from './useNotificationOsPermissionEffect';

/**
 * Lists notifications on startup.
 */
const useNotificationHandler = () => {
  useStartupNotificationsEffect();
  useNotificationOsPermissionEffect();
};

export default useNotificationHandler;
