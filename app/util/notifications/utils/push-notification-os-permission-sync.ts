import { store } from '../../../store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import { analytics } from '../../analytics/analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';

/**
 * The `source` reported on the "Push Notifications Disabled" event when the OS
 * notification permission is revoked from the device settings (outside the app).
 */
export const PUSH_DISABLED_SOURCE_SYSTEM_SETTINGS = 'system_settings' as const;

const trackPushNotificationsDisabled = (): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED,
    )
      .addProperties({ source: PUSH_DISABLED_SOURCE_SYSTEM_SETTINGS })
      .build(),
  );
  // Keep the user profile trait consistent: without OS permission, push can no
  // longer be delivered, so the user is effectively opted out of push.
  analytics.identify({
    [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
  });
};

/**
 * Detects when a user who had push notifications enabled revoked the OS-level
 * notification permission from the system settings, and fires the
 * `Push Notifications Disabled` analytics event once per revocation.
 *
 * Detection compares the last observed permission result (was the OS permission
 * granted while push notifications were enabled) against the current OS
 * permission. This is meant to be called when the app becomes active (mount +
 * background→active), so a change made in the system settings while the app was
 * away is caught when the user returns.
 *
 * The persisted last result both gates the event to users who actually had
 * notifications enabled and dedupes it: after firing, it flips to `false`, so
 * subsequent checks stay silent until permission is granted again.
 */
const runDetection = async (): Promise<void> => {
  if (!isNotificationsFeatureEnabled()) {
    return;
  }

  try {
    const osPermissionGranted = await isPushPermissionGranted();
    const previouslyGranted =
      mmStorage.getLocal(STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT) ===
      true;

    // Granted -> revoked transition: the user turned notifications off in the
    // system settings after having push notifications enabled.
    if (previouslyGranted && !osPermissionGranted) {
      trackPushNotificationsDisabled();
      mmStorage.saveLocal(
        STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
        false,
      );
      return;
    }

    // Update the last result: it is only "true" while push notifications are
    // enabled in-app AND the OS still grants permission.
    const pushEnabled = selectIsMetaMaskPushNotificationsEnabled(
      store.getState(),
    );
    mmStorage.saveLocal(
      STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
      Boolean(pushEnabled && osPermissionGranted),
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to detect push notification OS permission revocation',
    );
  }
};

// Serializes runs so overlapping invocations (e.g. the mount check and a
// background→active check firing close together) never both read a stale
// "granted" last result and emit duplicate events. Each call waits for the
// previous run to persist before it reads. `runDetection` never rejects, so the
// chain cannot get stuck.
let inFlight: Promise<void> = Promise.resolve();

/** @see runDetection */
export const detectPushNotificationOsPermissionRevocation =
  (): Promise<void> => {
    inFlight = inFlight.then(runDetection, runDetection);
    return inFlight;
  };
