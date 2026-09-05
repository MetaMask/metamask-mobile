import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import Logger from '../../Logger';
import { syncPushNotificationOsPermission } from '../utils/push-notification-os-permission-sync';

const LOG_PREFIX = '[PushOsPermissionSync]';

/**
 * Re-checks the OS notification permission (see
 * syncPushNotificationOsPermission) whenever it may have changed:
 *
 * - on mount, which covers a cold start after the permission was changed in
 * the system settings while the app was closed — the usual Android path,
 * since revoking the permission kills the process.
 * - on every transition to `active`, which covers returning from the system
 * settings (background -> active) and from the OS permission dialog, which
 * on iOS only makes the app `inactive`, never `background`.
 * - when the push controller flips `isPushEnabled`, which is the tail end of
 * the in-app enable flow: push registration completes asynchronously, after
 * the OS prompt has been answered. The sync itself does not read
 * `isPushEnabled`; this is only a hint that the permission may have just
 * been granted.
 */
export function useNotificationOsPermissionEffect() {
  const isPushEnabled = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    syncPushNotificationOsPermission(`isPushEnabled=${String(isPushEnabled)}`);
  }, [isPushEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        Logger.log(LOG_PREFIX, 'AppState', {
          from: lastAppState.current,
          to: nextAppState,
        });
        if (nextAppState === 'active' && lastAppState.current !== 'active') {
          syncPushNotificationOsPermission(
            `appState ${lastAppState.current}->${nextAppState}`,
          );
        }
        lastAppState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
