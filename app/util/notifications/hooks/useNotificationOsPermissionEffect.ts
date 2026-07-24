import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { detectPushNotificationOsPermissionRevocation } from '../utils/push-notification-os-permission-sync';

/**
 * Detects OS notification-permission changes made while the app was away.
 *
 * Runs the revocation check once on mount (covers a cold start after the user
 * disabled notifications in the system settings) and again on every
 * background -> active transition (covers the user leaving to the settings and
 * coming back). The intermediate iOS `inactive` state (e.g. system dialogs) is
 * ignored so returning from it is not treated as a fresh app open.
 */
export function useNotificationOsPermissionEffect() {
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Cold-start / mount check.
    detectPushNotificationOsPermissionRevocation();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && lastAppState.current === 'background') {
        detectPushNotificationOsPermissionRevocation();
      }

      // Don't overwrite 'background' with the intermediate 'inactive' state so
      // the background -> active check above still sees the original background.
      if (
        !(nextAppState === 'inactive' && lastAppState.current === 'background')
      ) {
        lastAppState.current = nextAppState;
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
