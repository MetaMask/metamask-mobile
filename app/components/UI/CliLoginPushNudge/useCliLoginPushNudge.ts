import { useCallback, useEffect, useRef, useState } from 'react';
// PermissionsAndroid usage below is gated behind `Platform.OS === 'android'`.
// eslint-disable-next-line react-native/split-platform-components
import { Alert, AppState, PermissionsAndroid, Platform } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { isNotificationsFeatureEnabled } from '../../../util/notifications/constants';
import { useEnableNotifications } from '../../../util/notifications/hooks/useNotifications';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
} from '../../../util/notifications/services/NotificationService';
import { subscribeCliLoginPushNudge } from '../../../core/AgenticCli/cliLoginPushNudgeSignal';
import logger from '../../../core/SDKConnectV2/services/logger';

/** Android API level (13) that introduced the POST_NOTIFICATIONS runtime permission. */
const ANDROID_POST_NOTIFICATIONS_API_LEVEL = 33;

/**
 * Drives the post-CLI-login push-permission bottom sheet (MMAI-925). Subscribes
 * to the module-level nudge signal to become visible after a successful login.
 * On "Enable notifications": requests OS permission when needed, opens device
 * notification settings when the OS dialog can no longer be shown, and enables
 * MetaMask in-app notifications once native push is granted.
 *
 * iOS: when the OS can still show its permission dialog, enableNotifications()
 * requests permission; denying that dialog does not open Settings. When the OS
 * can no longer show its dialog (e.g. after a prior denial), it deep-links to
 * device notification settings and retries once the app returns to foreground.
 *
 * Android: Notifee reports DENIED for both "never asked" and "permanently
 * denied", so we use PermissionsAndroid.request(POST_NOTIFICATIONS). Because the
 * user already signaled intent by tapping "Enable notifications", any deny opens
 * notification settings.
 */
export function useCliLoginPushNudge(): {
  isVisible: boolean;
  onYes: () => Promise<void>;
  onNotNow: () => void;
  onClose: (hasPendingAction?: boolean) => void;
} {
  const [isVisible, setIsVisible] = useState(false);
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: true,
  });

  const inFlightRef = useRef(false);
  // Bumped each time a new nudge is shown so a fresh CLI login supersedes any
  // in-progress enable flow: async continuations compare their captured epoch
  // and skip their side effects once superseded, preventing overlapping enable
  // calls and settings opens.
  const flowEpochRef = useRef(0);
  const appStateSubscriptionRef = useRef<ReturnType<
    typeof AppState.addEventListener
  > | null>(null);

  const clearForegroundRetry = useCallback(() => {
    appStateSubscriptionRef.current?.remove();
    appStateSubscriptionRef.current = null;
  }, []);

  const showEnableNotificationsError = useCallback(() => {
    Alert.alert(
      strings('notifications.notifications_enabled_error_title'),
      strings('notifications.notifications_enabled_error_desc'),
    );
  }, []);

  const scheduleForegroundRetry = useCallback(
    (retry: () => Promise<void>) => {
      clearForegroundRetry();
      appStateSubscriptionRef.current = AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState !== 'active') {
            return;
          }
          clearForegroundRetry();
          retry().catch((error) => {
            logger.warn(
              'Failed to enable notifications after returning from settings',
              error,
            );
            showEnableNotificationsError();
          });
        },
      );
    },
    [clearForegroundRetry, showEnableNotificationsError],
  );

  const runEnableNotifications = useCallback(async () => {
    await enableNotifications();
  }, [enableNotifications]);

  const openSettingsAndScheduleRetry = useCallback(
    (isCurrent: () => boolean) => {
      // Release the in-flight guard before opening system settings so that a
      // throw from openSystemSettings() can't leave "Enable notifications"
      // permanently locked. The scheduled foreground retry owns its own guard.
      inFlightRef.current = false;
      NotificationService.openSystemSettings();
      scheduleForegroundRetry(async () => {
        if (!isCurrent()) {
          return;
        }
        inFlightRef.current = true;
        try {
          if (!(await isPushPermissionGranted())) {
            return;
          }
          if (!isCurrent()) {
            return;
          }
          await runEnableNotifications();
        } finally {
          inFlightRef.current = false;
        }
      });
    },
    [runEnableNotifications, scheduleForegroundRetry],
  );

  const runGrantedFlow = useCallback(
    async (isCurrent: () => boolean) => {
      if (!isCurrent()) {
        return;
      }
      await runEnableNotifications();
    },
    [runEnableNotifications],
  );

  const runAndroidPermissionFlow = useCallback(
    async (isCurrent: () => boolean) => {
      // Android < 13 has no runtime dialog; when notifications are not already
      // granted they can only be enabled from system settings.
      if (Number(Platform.Version) < ANDROID_POST_NOTIFICATIONS_API_LEVEL) {
        openSettingsAndScheduleRetry(isCurrent);
        return;
      }
      // Android 13+ requires the POST_NOTIFICATIONS runtime permission.
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!isCurrent()) {
        return;
      }
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        await runEnableNotifications();
        return;
      }
      // The user tapped "Enable notifications", so any deny (dismissed dialog or
      // permanent denial) opens notification settings — the intent to enable is
      // unambiguous.
      openSettingsAndScheduleRetry(isCurrent);
    },
    [openSettingsAndScheduleRetry, runEnableNotifications],
  );

  const runIosPermissionFlow = useCallback(
    async (isCurrent: () => boolean) => {
      const promptable = await isPushPermissionPromptable();
      if (!isCurrent()) {
        return;
      }
      if (!promptable) {
        openSettingsAndScheduleRetry(isCurrent);
        return;
      }
      // OS can still show its dialog — request permission via
      // enableNotifications(). If the user denies, do not open Settings (matches
      // PushNotificationOnboarding).
      await runEnableNotifications();
    },
    [openSettingsAndScheduleRetry, runEnableNotifications],
  );

  const runPermissionFlow = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;

    const epoch = flowEpochRef.current;
    const isCurrent = () => flowEpochRef.current === epoch;

    try {
      if (await isPushPermissionGranted()) {
        await runGrantedFlow(isCurrent);
        return;
      }
      if (!isCurrent()) {
        return;
      }

      if (Platform.OS === 'android') {
        await runAndroidPermissionFlow(isCurrent);
        return;
      }

      await runIosPermissionFlow(isCurrent);
    } catch (error) {
      logger.warn('Failed to run CLI login push permission flow', error);
      showEnableNotificationsError();
    } finally {
      if (!appStateSubscriptionRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [
    runGrantedFlow,
    runAndroidPermissionFlow,
    runIosPermissionFlow,
    showEnableNotificationsError,
  ]);

  const onYes = useCallback(() => {
    setIsVisible(false);
    return runPermissionFlow();
  }, [runPermissionFlow]);

  const onNotNow = useCallback(() => {
    setIsVisible(false);
  }, []);

  // BottomSheet passes hasPendingAction=true when a button (Yes/Not now) drove
  // the close; those are handled by onYes/onNotNow, so only react to genuine
  // dismissals (backdrop, close icon, hardware back).
  const onClose = useCallback((hasPendingAction?: boolean) => {
    if (hasPendingAction) {
      return;
    }
    setIsVisible(false);
  }, []);

  useEffect(
    () =>
      subscribeCliLoginPushNudge(() => {
        if (!isNotificationsFeatureEnabled()) {
          return;
        }
        clearForegroundRetry();
        flowEpochRef.current += 1;
        inFlightRef.current = false;
        setIsVisible(true);
      }),
    [clearForegroundRetry],
  );

  useEffect(
    () => () => {
      clearForegroundRetry();
    },
    [clearForegroundRetry],
  );

  return { isVisible, onYes, onNotNow, onClose };
}
