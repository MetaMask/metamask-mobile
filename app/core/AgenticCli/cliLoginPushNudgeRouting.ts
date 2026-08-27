import type { PushPermissionStatus } from '../../util/notifications/services/NotificationService';

/**
 * Whether the post-CLI-login push nudge should appear. Requires both MetaMask
 * in-app notifications (Settings → Notifications) and native OS push permission.
 */
export function shouldShowCliLoginPushNudge({
  isMetamaskNotificationsEnabled,
  isMetaMaskPushNotificationsEnabled,
  nativePushStatus,
}: {
  isMetamaskNotificationsEnabled: boolean;
  isMetaMaskPushNotificationsEnabled: boolean;
  nativePushStatus: PushPermissionStatus;
}): boolean {
  if (!isMetamaskNotificationsEnabled) {
    return true;
  }
  if (nativePushStatus !== 'granted') {
    return true;
  }
  if (!isMetaMaskPushNotificationsEnabled) {
    return true;
  }
  return false;
}
