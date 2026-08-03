import Engine from '../../../core/Engine';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';

// Read push-enabled from the controller directly, NOT the Redux selector.
// Controller state changes reach Redux through a 250ms batcher, so a selector
// read right after enablePushNotifications/enableMetamaskNotifications would see
// a stale `false` and fail to arm the baseline. The controller sets its own
// state synchronously during the awaited enable, so it is authoritative here.
const isControllerPushEnabled = (): boolean =>
  Boolean(
    Engine.context.NotificationServicesPushController?.state?.isPushEnabled,
  );

/** Reads the persisted "OS permission was granted while push was enabled" flag. */
export const readPushOsPermissionBaseline = (): boolean =>
  mmStorage.getLocal(STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT) ===
  true;

export const writePushOsPermissionBaseline = (value: boolean): void =>
  mmStorage.saveLocal(
    STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
    value,
  );

/**
 * Stores the baseline as "true" only while push notifications are enabled in-app
 * AND the OS still grants permission. This both gates the revocation event to
 * users who actually had notifications enabled and keeps the flag in sync.
 */
export const storeComputedPushOsPermissionBaseline = (
  osPermissionGranted: boolean,
): void => {
  writePushOsPermissionBaseline(
    Boolean(isControllerPushEnabled() && osPermissionGranted),
  );
};

// Single serialization chain shared with the detection side so an arm and a
// detection run never interleave on the flag. Tasks never reject (they catch
// internally), so the chain cannot get stuck.
let inFlight: Promise<void> = Promise.resolve();

export const enqueuePushOsPermissionBaselineTask = (
  task: () => Promise<void>,
): Promise<void> => {
  inFlight = inFlight.then(task, task);
  return inFlight;
};

const runArm = async (): Promise<void> => {
  if (!isNotificationsFeatureEnabled()) {
    return;
  }

  try {
    const osPermissionGranted = await isPushPermissionGranted();
    storeComputedPushOsPermissionBaseline(osPermissionGranted);
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to arm push notification OS permission baseline',
    );
  }
};

/**
 * Arms the baseline after push notifications are enabled, so a later revocation
 * from the system settings is detected even when the first resume is already
 * revoked (or the process was killed before any granted resume). Call this right
 * after a successful enable; it recomputes from live push + OS-permission state,
 * so it is a no-op when push did not actually end up enabled.
 */
export const armPushNotificationOsPermissionBaseline = (): Promise<void> =>
  enqueuePushOsPermissionBaselineTask(runArm);
