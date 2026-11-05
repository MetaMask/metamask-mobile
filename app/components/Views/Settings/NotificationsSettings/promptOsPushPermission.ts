import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import Logger from '../../../../util/Logger';

/**
 * Prompts for OS push permission when it is not granted: the OS dialog if the
 * OS can still ask, otherwise the alert that links to the system Settings.
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
    if (await isPushPermissionPromptable()) {
      await requestPushPermissions();
    } else {
      await NotificationService.requestPushNotificationsPermission();
    }
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'promptOsPushPermissionIfNeeded: failed to request push permission',
    );
  }

  return isPushPermissionGranted();
}
