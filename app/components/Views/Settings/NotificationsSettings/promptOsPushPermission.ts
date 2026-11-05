import { AppState } from 'react-native';
import NotificationService, {
  canOsPromptForPushPermission,
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import Logger from '../../../../util/Logger';

/**
 * How long to wait for the app to leave the foreground after asking the OS to
 * open the system settings. If it never leaves, the settings did not open.
 */
export const LEAVE_FOREGROUND_TIMEOUT_MS = 3000;

/**
 * Resolves once the app is back in the foreground after the system settings
 * were opened, or after LEAVE_FOREGROUND_TIMEOUT_MS if it never left.
 */
const waitForReturnFromSystemSettings = (): Promise<void> =>
  new Promise((resolve) => {
    let hasLeftForeground = AppState.currentState !== 'active';

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        hasLeftForeground = true;
        return;
      }
      if (hasLeftForeground) {
        finish();
      }
    });

    const leaveTimeout = setTimeout(() => {
      if (!hasLeftForeground) {
        finish();
      }
    }, LEAVE_FOREGROUND_TIMEOUT_MS);

    function finish() {
      clearTimeout(leaveTimeout);
      subscription.remove();
      resolve();
    }
  });

/**
 * Prompts for OS push permission when it is not granted: the OS dialog if the
 * OS can still ask, otherwise (including Android < 13, which has no runtime
 * dialog) the alert that links to the system Settings. In
 * the latter case it waits for the user to come back before reading the
 * permission, so a grant made in the system Settings is picked up.
 *
 * Never throws, so callers can always fall back to in-app notifications.
 *
 * @returns Whether the OS grants push permission after prompting.
 */
export async function promptOsPushPermissionIfNeeded(): Promise<boolean> {
  if (await isPushPermissionGranted()) {
    return true;
  }

  try {
    if (
      canOsPromptForPushPermission() &&
      (await isPushPermissionPromptable())
    ) {
      await requestPushPermissions();
    } else if (await NotificationService.requestPushNotificationsPermission()) {
      await waitForReturnFromSystemSettings();
    }
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'promptOsPushPermissionIfNeeded: failed to request push permission',
    );
  }

  return isPushPermissionGranted();
}
