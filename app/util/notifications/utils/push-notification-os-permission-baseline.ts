import { store } from '../../../store';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';

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
  const pushEnabled = selectIsMetaMaskPushNotificationsEnabled(
    store.getState(),
  );
  writePushOsPermissionBaseline(Boolean(pushEnabled && osPermissionGranted));
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
