import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import { syncPushNotificationOsPermission } from '../utils/push-notification-os-permission-sync';

/**
 * Android's NotificationManager can keep reporting the previous permission
 * for a short window after the user returns from system Settings. Re-running
 * the sync after this delay catches a revocation that the first read missed.
 */
export const ANDROID_OS_PERMISSION_REFRESH_DELAY_MS = 500;

/**
 * Keeps the push OS-permission snapshot in sync (see
 * syncPushNotificationOsPermission) by running the sync whenever its inputs
 * may have changed:
 *
 * - when the push controller flips `isPushEnabled` — push registration
 * completes asynchronously, well after the in-app enable/disable helpers
 * resolve, so reacting to the actual flip is the only reliable point to
 * arm/clear the snapshot. The same effect covers the mount / cold-start
 * check (a system-settings change made while the app was closed).
 * - on every transition to `active` — covers returning from the system
 * settings (background -> active) and from the OS permission dialog, which
 * on iOS only makes the app `inactive`, never `background`. On Android the
 * sync is scheduled again after ANDROID_OS_PERMISSION_REFRESH_DELAY_MS
 * because NotificationManager can briefly report the previous permission.
 */
export function useNotificationOsPermissionEffect() {
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    syncPushNotificationOsPermission();
  }, [isPushEnabled]);

  useEffect(() => {
    let androidRefreshTimeout: ReturnType<typeof setTimeout> | undefined;

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && lastAppState.current !== 'active') {
          syncPushNotificationOsPermission();

          if (Platform.OS === 'android') {
            if (androidRefreshTimeout) {
              clearTimeout(androidRefreshTimeout);
            }
            androidRefreshTimeout = setTimeout(() => {
              androidRefreshTimeout = undefined;
              syncPushNotificationOsPermission();
            }, ANDROID_OS_PERMISSION_REFRESH_DELAY_MS);
          }
        }
        lastAppState.current = nextAppState;
      },
    );

    return () => {
      if (androidRefreshTimeout) {
        clearTimeout(androidRefreshTimeout);
      }
      subscription.remove();
    };
  }, []);
}
