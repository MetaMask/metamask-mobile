import { useStartupNotificationsEffect } from './useStartupNotificationsEffect';
import { useNotificationOsPermissionEffect } from './useNotificationOsPermissionEffect';

/**
 * Lists notifications on startup.
 */
const useNotificationHandler = () => {
  useStartupNotificationsEffect();
  // Detects OS notification-permission being revoked from the system settings.
  useNotificationOsPermissionEffect();
};

export default useNotificationHandler;
