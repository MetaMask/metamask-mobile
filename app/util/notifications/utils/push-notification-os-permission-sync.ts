import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import { analytics } from '../../analytics/analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';

/**
 * Persisted result of the last OS notification-permission check. Comparing it
 * against the live permission on each sync is what lets us detect a change
 * made while the app was away — in the system settings, and possibly across
 * process death.
 */
const readLastOsPermissionGranted = (): boolean =>
  mmStorage.getLocal(STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT) ===
  true;

const writeLastOsPermissionGranted = (value: boolean): void =>
  mmStorage.saveLocal(
    STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
    value,
  );

// Whether the user has MetaMask notifications switched on. Read from the
// controller directly rather than Redux so the value is live at the moment the
// queued sync actually runs — Redux lags controller state through a 250ms
// batcher.
//
// Deliberately not `NotificationServicesPushController.isPushEnabled`: Engine
// init force-disables that flag whenever OS permission is missing (see
// create-notification-services-push-controller) and never restores it, so it
// cannot distinguish "user turned push off" from "the OS revocation we are
// trying to report".
const areNotificationsEnabled = (): boolean =>
  Boolean(
    Engine.context.NotificationServicesController?.state
      ?.isNotificationServicesEnabled,
  );

const LOG_PREFIX = '[PushOsPermissionSync]';

const trackPushNotificationsDisabled = (): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED,
    ).build(),
  );
  // Without OS permission push can no longer be delivered, so the user is
  // effectively opted out of push.
  analytics.identify({
    [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
  });
};

const runSync = async (trigger: string): Promise<void> => {
  if (!isNotificationsFeatureEnabled()) {
    return;
  }

  try {
    const notificationsEnabled = areNotificationsEnabled();
    const osPermissionGranted = await isPushPermissionGranted();
    const wasOsPermissionGranted = readLastOsPermissionGranted();

    Logger.log(LOG_PREFIX, 'sync', {
      trigger,
      notificationsEnabled,
      osPermissionGranted,
      wasOsPermissionGranted,
    });

    // Always persist, even when notifications are off, so that a permission
    // change made while the user was opted out is not reported later as if it
    // had just happened.
    writeLastOsPermissionGranted(osPermissionGranted);

    if (wasOsPermissionGranted === osPermissionGranted || !notificationsEnabled) {
      return;
    }

    if (osPermissionGranted) {
      Logger.log(LOG_PREFIX, 'OS permission granted');
      analytics.identify({
        [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
      });
    } else {
      Logger.log(LOG_PREFIX, 'OS permission revoked, emitting opt-out');
      trackPushNotificationsDisabled();
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to sync push notification OS permission state',
    );
  }
};

// Serialize syncs so overlapping runs (a controller flip racing a foreground
// transition) cannot both observe the same stored permission and emit
// duplicate events. Tasks never reject (runSync catches internally), so the
// chain cannot get stuck.
let inFlight: Promise<void> = Promise.resolve();

/**
 * Reconciles the persisted OS notification-permission result with the live
 * permission and reports the edges, as long as the user has MetaMask
 * notifications switched on:
 *
 * - granted -> revoked: fires `Push Notifications Disabled` and sets the push
 * profile trait to false. Because only the OS permission is tracked, this
 * still fires when Engine has already force-disabled `isPushEnabled` in
 * response to the same revocation (the usual Android path, where revoking
 * kills the process), and it re-arms by itself once permission is granted
 * again.
 * - revoked -> granted: restores the push profile trait to true.
 *
 * An in-app disable leaves OS permission untouched, so it produces no edge and
 * is not reported here.
 *
 * Call it whenever the permission may have changed:
 * useNotificationOsPermissionEffect does so on mount and on every return to
 * the `active` app state.
 */
export const syncPushNotificationOsPermission = (
  trigger = 'unspecified',
): Promise<void> => {
  inFlight = inFlight.then(
    () => runSync(trigger),
    () => runSync(trigger),
  );
  return inFlight;
};
