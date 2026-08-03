import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../analytics/analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Logger from '../../Logger';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import {
  enqueuePushOsPermissionBaselineTask,
  readPushOsPermissionBaseline,
  storeComputedPushOsPermissionBaseline,
  writePushOsPermissionBaseline,
} from './push-notification-os-permission-baseline';

const trackPushNotificationsDisabled = (): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED,
    ).build(),
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
 * away is caught when the user returns. The baseline is armed at enable time via
 * armPushNotificationOsPermissionBaseline so a first-resume-already-revoked case
 * is still caught.
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
    const previouslyGranted = readPushOsPermissionBaseline();

    // Granted -> revoked transition: the user turned notifications off in the
    // system settings after having push notifications enabled.
    if (previouslyGranted && !osPermissionGranted) {
      trackPushNotificationsDisabled();
      writePushOsPermissionBaseline(false);
      return;
    }

    storeComputedPushOsPermissionBaseline(osPermissionGranted);
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to detect push notification OS permission revocation',
    );
  }
};

/** @see runDetection */
export const detectPushNotificationOsPermissionRevocation =
  (): Promise<void> => enqueuePushOsPermissionBaselineTask(runDetection);
