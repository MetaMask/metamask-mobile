import { useCallback } from 'react';
import Engine from '../../../core/Engine';

export function usePushNotifications() {
  const switchPushNotifications = useCallback((state: boolean) => {
    Engine?.context?.NotificationServicesPushController?.setIsPushNotificationsEnabled(
      state,
    );
  }, []);

  return {
    switchPushNotifications,
  };
}
