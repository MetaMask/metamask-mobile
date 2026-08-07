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
 * Persisted snapshot of the last observed "push is effectively enabled" state:
 * push enabled in-app AND OS notification permission granted. Comparing it
 * against the live state on each sync lets us catch changes made while the app
 * was away (system settings, process death) and emit analytics on the edges.
 */
const readStoredEffectivePushState = (): boolean =>
  mmStorage.getLocal(STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT) ===
  true;

const writeStoredEffectivePushState = (value: boolean): void =>
  mmStorage.saveLocal(
    STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
    value,
  );

// Read push-enabled from the controller directly rather than Redux so the
// value is live at the moment the queued sync actually runs — Redux lags
// controller state through a 250ms batcher.
const isControllerPushEnabled = (): boolean =>
  Boolean(
    Engine.context.NotificationServicesPushController?.state?.isPushEnabled,
  );

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

const runSync = async (): Promise<void> => {
  if (!isNotificationsFeatureEnabled()) {
    return;
  }

  try {
    const pushEnabledInApp = isControllerPushEnabled();
    const osPermissionGranted = await isPushPermissionGranted();
    const wasEffectivelyEnabled = readStoredEffectivePushState();
    const isEffectivelyEnabled = pushEnabledInApp && osPermissionGranted;

    if (wasEffectivelyEnabled === isEffectivelyEnabled) {
      return;
    }
    writeStoredEffectivePushState(isEffectivelyEnabled);

    if (wasEffectivelyEnabled && pushEnabledInApp) {
      // Push is still on in-app but the OS permission is gone: the user
      // revoked it from the system settings. An in-app disable also flips the
      // snapshot to false but lands in neither branch (pushEnabledInApp is
      // false by the time the disable helper syncs), so no event fires for it.
      trackPushNotificationsDisabled();
    } else if (isEffectivelyEnabled) {
      // Enabled or re-granted: restore the profile trait, which a previous
      // revocation may have set to false.
      analytics.identify({
        [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
      });
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to sync push notification OS permission state',
    );
  }
};

// Serialize syncs so overlapping runs (an isPushEnabled flip racing a
// foreground transition) cannot both observe the same stored snapshot and
// emit duplicate events. Tasks never reject (runSync catches internally), so
// the chain cannot get stuck.
let inFlight: Promise<void> = Promise.resolve();

/**
 * Reconciles the persisted "push effectively enabled" snapshot (push enabled
 * in-app AND OS permission granted) with the live state, and emits analytics
 * on the transitions:
 *
 * - enabled -> OS permission revoked: fires `Push Notifications Disabled` once
 * per revocation and sets the push profile trait to false. The persisted
 * snapshot flips to false, so repeat checks stay silent until re-granted.
 * - disabled -> enabled (first enable, or permission re-granted): restores the
 * push profile trait to true.
 * - in-app disable: silently clears the snapshot so a later OS-level change is
 * not misreported as a revocation.
 *
 * Call it whenever the effective state may have changed. Note that the in-app
 * enable/disable helpers resolve BEFORE the controller flips `isPushEnabled`
 * (push registration is fire-and-forget inside the controller), so syncing
 * from those helpers is too early — useNotificationOsPermissionEffect instead
 * reacts to the actual `isPushEnabled` change, plus mount and every return to
 * the `active` app state.
 */
export const syncPushNotificationOsPermission = (): Promise<void> => {
  inFlight = inFlight.then(runSync, runSync);
  return inFlight;
};
