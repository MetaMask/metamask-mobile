import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getPushPermissionStatus } from '../../../../../util/notifications/services/NotificationService';

/**
 * Whether OS push permission is denied, so settings can offer the device
 * Settings recovery path. Refreshed when the app becomes active, since the
 * user leaves the app to grant permission.
 */
export function useOsPushPermissionDenied(): boolean {
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const update = async () => {
      const permissionStatus = await getPushPermissionStatus();
      if (isMounted) {
        setIsDenied(permissionStatus === 'denied');
      }
    };

    void update();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void update();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isDenied;
}
