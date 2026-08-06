import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncPushNotificationOsPermission } from '../utils/push-notification-os-permission-sync';
import { pushSyncDebugLog } from '../utils/push-sync-debug-log';

/**
 * Syncs the push OS-permission state after changes made while the app was away.
 *
 * Runs the sync once on mount (covers a cold start after the user disabled
 * notifications in the system settings) and again on every
 * background -> active transition (covers the user leaving to the settings and
 * coming back). The intermediate iOS `inactive` state (e.g. system dialogs) is
 * ignored so returning from it is not treated as a fresh app open.
 */
export function useNotificationOsPermissionEffect() {
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    pushSyncDebugLog('hook:mount', () => ({
      initialAppState: lastAppState.current,
    }));

    // Cold-start / mount check.
    syncPushNotificationOsPermission('hook:mount');

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = lastAppState.current;
      const willSync =
        nextAppState === 'active' && previousAppState === 'background';

      pushSyncDebugLog('hook:appStateChange', () => ({
        previousAppState,
        nextAppState,
        willSync,
      }));

      if (willSync) {
        syncPushNotificationOsPermission('hook:background->active');
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
