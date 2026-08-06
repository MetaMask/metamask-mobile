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
import { pushSyncDebugLog } from './push-sync-debug-log';

let syncRunCounter = 0;

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

// Read push-enabled from the controller directly, NOT the Redux selector.
// Controller state changes reach Redux through a 250ms batcher, so a selector
// read right after enablePushNotifications/enableMetamaskNotifications would
// see a stale `false`. The controller sets its own state synchronously during
// the awaited enable, so it is authoritative here.
const isControllerPushEnabled = (): boolean =>
  Boolean(
    Engine.context.NotificationServicesPushController?.state?.isPushEnabled,
  );

const trackPushNotificationsDisabled = (runId: number): void => {
  const event = AnalyticsEventBuilder.createEventBuilder(
    MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED,
  ).build();

  pushSyncDebugLog('trackEvent:about-to-call', () => ({
    runId,
    eventName: event.name,
    analyticsIsEnabled: analytics.isEnabled(),
  }));

  analytics.trackEvent(event);
  // Without OS permission push can no longer be delivered, so the user is
  // effectively opted out of push.
  analytics.identify({
    [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
  });

  pushSyncDebugLog('trackEvent:called', () => ({
    runId,
    eventName: event.name,
  }));
};

const runSync = async (): Promise<void> => {
  const runId = ++syncRunCounter;
  const featureEnabled = isNotificationsFeatureEnabled();

  pushSyncDebugLog('runSync:start', () => ({ runId, featureEnabled }));

  if (!featureEnabled) {
    pushSyncDebugLog('runSync:abort-feature-disabled', () => ({ runId }));
    return;
  }

  try {
    const pushEnabledInApp = isControllerPushEnabled();
    const osPermissionGranted = await isPushPermissionGranted();
    const wasEffectivelyEnabled = readStoredEffectivePushState();
    const isEffectivelyEnabled = pushEnabledInApp && osPermissionGranted;

    pushSyncDebugLog('runSync:state', () => ({
      runId,
      pushEnabledInApp,
      rawControllerIsPushEnabled:
        Engine.context.NotificationServicesPushController?.state?.isPushEnabled,
      hasPushController: Boolean(
        Engine.context.NotificationServicesPushController,
      ),
      osPermissionGranted,
      rawStoredSnapshot: mmStorage.getLocal(
        STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT,
      ),
      wasEffectivelyEnabled,
      isEffectivelyEnabled,
      willReturnEarly: wasEffectivelyEnabled === isEffectivelyEnabled,
    }));

    if (wasEffectivelyEnabled === isEffectivelyEnabled) {
      pushSyncDebugLog('runSync:abort-no-transition', () => ({
        runId,
        wasEffectivelyEnabled,
        isEffectivelyEnabled,
      }));
      return;
    }
    writeStoredEffectivePushState(isEffectivelyEnabled);

    if (wasEffectivelyEnabled && pushEnabledInApp) {
      // Push is still on in-app but the OS permission is gone: the user
      // revoked it from the system settings. An in-app disable also flips the
      // snapshot to false but lands in neither branch (pushEnabledInApp is
      // false by the time the disable helper syncs), so no event fires for it.
      pushSyncDebugLog('runSync:branch-revoked', () => ({ runId }));
      trackPushNotificationsDisabled(runId);
    } else if (isEffectivelyEnabled) {
      // Enabled or re-granted: restore the profile trait, which a previous
      // revocation may have set to false.
      pushSyncDebugLog('runSync:branch-enabled-identify-only', () => ({
        runId,
      }));
      analytics.identify({
        [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
      });
    } else {
      pushSyncDebugLog('runSync:branch-none', () => ({
        runId,
        wasEffectivelyEnabled,
        pushEnabledInApp,
        isEffectivelyEnabled,
      }));
    }
  } catch (error) {
    pushSyncDebugLog('runSync:error', () => ({
      runId,
      message: (error as Error)?.message,
    }));
    Logger.error(
      error as Error,
      'Failed to sync push notification OS permission state',
    );
  }
};

// Serialize syncs so overlapping runs (mount + background→active, or an
// enable helper racing the resume check) cannot both observe the same stored
// snapshot and emit duplicate events. Tasks never reject (runSync catches
// internally), so the chain cannot get stuck.
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
 * Call it whenever the effective state may have changed: after the in-app
 * enable/disable helpers, on mount (cold start after a settings change), and
 * on background -> active transitions.
 */
export const syncPushNotificationOsPermission = (
  caller = 'unknown',
): Promise<void> => {
  pushSyncDebugLog('sync:queued', () => ({ caller }));
  inFlight = inFlight.then(runSync, runSync);
  return inFlight;
};
