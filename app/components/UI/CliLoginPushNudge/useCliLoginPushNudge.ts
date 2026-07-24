import { useCallback, useContext, useEffect, useRef } from 'react';
// PermissionsAndroid usage below is gated behind `Platform.OS === 'android'`.
// eslint-disable-next-line react-native/split-platform-components
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { ToastContext } from '../../../component-library/components/Toast';
import {
  ToastVariants,
  ButtonIconVariant,
} from '../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { isNotificationsFeatureEnabled } from '../../../util/notifications/constants';
import { useEnableNotifications } from '../../../util/notifications/hooks/useNotifications';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
} from '../../../util/notifications/services/NotificationService';

/** Android API level (13) that introduced the POST_NOTIFICATIONS runtime permission. */
const ANDROID_POST_NOTIFICATIONS_API_LEVEL = 33;

/**
 * Below this threshold, `PermissionsAndroid.request(POST_NOTIFICATIONS)` likely
 * returned without showing the OS dialog (permanent deny). Only applies to the
 * direct PermissionsAndroid call — not Notifee channel setup.
 */
const ANDROID_OS_DIALOG_MIN_ELAPSED_MS = 300;

function shouldOpenAndroidNotificationSettings(
  result: string,
  requestElapsedMs: number,
): boolean {
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return true;
  }
  return (
    result === PermissionsAndroid.RESULTS.DENIED &&
    requestElapsedMs < ANDROID_OS_DIALOG_MIN_ELAPSED_MS
  );
}

const NUDGE_LABELS = () => [
  { label: strings('sdk_connect_v2.push_nudge.title'), isBold: true },
];

const LOADING_LABELS = () => [
  { label: strings('sdk_connect_v2.push_nudge.loading_title'), isBold: true },
];

const ERROR_LABELS = () => [
  { label: strings('sdk_connect_v2.push_nudge.enable_error') },
];

/**
 * Shared toast-based push-permission nudge shown after a successful Agentic CLI
 * QR login (MMAI-925). On "Turn on": when the OS can still show its permission
 * dialog it calls enableNotifications() (in-app notifications + OS prompt).
 * Denying that dialog closes the toast without opening Settings. When the OS can
 * no longer show its dialog (e.g. iOS after a prior denial), it deep-links to
 * device notification settings and retries once the app returns to foreground.
 *
 * Android: Notifee reports DENIED for both "never asked" and "permanently
 * denied", so we use PermissionsAndroid.request(POST_NOTIFICATIONS) and
 * treat NEVER_ASK_AGAIN as the signal to open device notification settings.
 */
export function useCliLoginPushNudge(): {
  showNudge: () => boolean;
} {
  const { toastRef } = useContext(ToastContext);
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: true,
  });

  const inFlightRef = useRef(false);
  // Bumped each time a new nudge is shown so a fresh CLI login supersedes any
  // in-progress Turn on flow: async continuations compare their captured epoch
  // and skip their side effects once superseded, preventing overlapping enable
  // calls, settings opens, and toast updates.
  const flowEpochRef = useRef(0);
  const appStateSubscriptionRef = useRef<ReturnType<
    typeof AppState.addEventListener
  > | null>(null);

  const showLoadingToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Loading,
      hasNoTimeout: true,
      labelOptions: LOADING_LABELS(),
      descriptionOptions: {
        description: strings('sdk_connect_v2.push_nudge.loading_description'),
      },
    });
  }, [toastRef]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Danger,
      hasNoTimeout: false,
      labelOptions: ERROR_LABELS(),
    });
  }, [toastRef]);

  const clearForegroundRetry = useCallback(() => {
    appStateSubscriptionRef.current?.remove();
    appStateSubscriptionRef.current = null;
  }, []);

  const runEnableFlow = useCallback(
    async (isCurrent: () => boolean) => {
      try {
        await enableNotifications();
        if (isCurrent()) {
          toastRef?.current?.closeToast();
        }
      } catch {
        if (isCurrent()) {
          toastRef?.current?.closeToast();
          showErrorToast();
        }
      }
    },
    [enableNotifications, toastRef, showErrorToast],
  );

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
          void retry();
        },
      );
    },
    [clearForegroundRetry],
  );

  const openSettingsAndScheduleRetry = useCallback(
    (isCurrent: () => boolean) => {
      toastRef?.current?.closeToast();
      NotificationService.openSystemSettings();
      scheduleForegroundRetry(async () => {
        if (!isCurrent()) {
          return;
        }
        inFlightRef.current = true;
        try {
          if (!(await isPushPermissionGranted())) {
            if (isCurrent()) {
              toastRef?.current?.closeToast();
            }
            return;
          }
          if (!isCurrent()) {
            return;
          }
          showLoadingToast();
          await runEnableFlow(isCurrent);
        } finally {
          inFlightRef.current = false;
        }
      });
      inFlightRef.current = false;
    },
    [runEnableFlow, scheduleForegroundRetry, showLoadingToast, toastRef],
  );

  const onTapTurnOn = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;

    const epoch = flowEpochRef.current;
    const isCurrent = () => flowEpochRef.current === epoch;

    try {
      if (await isPushPermissionGranted()) {
        if (!isCurrent()) {
          return;
        }
        showLoadingToast();
        await enableNotifications();
        if (isCurrent()) {
          toastRef?.current?.closeToast();
        }
        return;
      }
      if (!isCurrent()) {
        return;
      }

      if (Platform.OS === 'android') {
        showLoadingToast();
        // Android 13+ requires the POST_NOTIFICATIONS runtime permission. The
        // request resolves to NEVER_ASK_AGAIN once the user has permanently
        // denied it, which is the authoritative signal that the OS dialog can
        // no longer be shown.
        if (Number(Platform.Version) >= ANDROID_POST_NOTIFICATIONS_API_LEVEL) {
          const requestStartedAt = Date.now();
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          const requestElapsedMs = Date.now() - requestStartedAt;
          if (!isCurrent()) {
            return;
          }
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            await runEnableFlow(isCurrent);
            return;
          }
          if (shouldOpenAndroidNotificationSettings(result, requestElapsedMs)) {
            openSettingsAndScheduleRetry(isCurrent);
            return;
          }
          // DENIED after the OS dialog was shown and dismissed.
          if (isCurrent()) {
            toastRef?.current?.closeToast();
          }
          return;
        }

        // Android < 13 has no runtime dialog; when notifications are not
        // already granted they can only be enabled from system settings.
        openSettingsAndScheduleRetry(isCurrent);
        return;
      }

      const promptable = await isPushPermissionPromptable();
      if (!isCurrent()) {
        return;
      }

      if (!promptable) {
        openSettingsAndScheduleRetry(isCurrent);
        return;
      }

      // iOS: OS can still show its dialog — request permission via enableNotifications().
      // If the user denies, dismiss the toast without opening Settings (matches
      // PushNotificationOnboarding).
      showLoadingToast();
      await enableNotifications();
      if (isCurrent()) {
        toastRef?.current?.closeToast();
      }
    } catch {
      if (isCurrent()) {
        toastRef?.current?.closeToast();
        showErrorToast();
      }
    } finally {
      if (!appStateSubscriptionRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [
    enableNotifications,
    openSettingsAndScheduleRetry,
    runEnableFlow,
    showErrorToast,
    showLoadingToast,
    toastRef,
  ]);

  const showNudge = useCallback((): boolean => {
    if (!isNotificationsFeatureEnabled()) {
      return false;
    }
    // A new nudge supersedes any in-progress Turn on flow: cancel a pending
    // foreground retry, invalidate in-flight async continuations via the epoch,
    // and release the guard so this toast's Turn on is not blocked.
    clearForegroundRetry();
    flowEpochRef.current += 1;
    inFlightRef.current = false;
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Notification,
      hasNoTimeout: true,
      labelOptions: NUDGE_LABELS(),
      descriptionOptions: {
        description: strings('sdk_connect_v2.push_nudge.description'),
      },
      linkButtonOptions: {
        label: strings('sdk_connect_v2.push_nudge.turn_on_button'),
        onPress: onTapTurnOn,
      },
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: () => {
          toastRef?.current?.closeToast();
        },
      },
    });
    return true;
  }, [onTapTurnOn, toastRef, clearForegroundRetry]);

  useEffect(
    () => () => {
      clearForegroundRetry();
    },
    [clearForegroundRetry],
  );

  return { showNudge };
}
