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
 * QR login (MMAI-925). On "Turn on", tapping the nudge signals intent to enable
 * notifications.
 *
 * iOS: when the OS can still show its permission dialog, enableNotifications()
 * requests permission; denying that dialog closes the toast without opening
 * Settings. When the OS can no longer show its dialog (e.g. after a prior
 * denial), it deep-links to device notification settings and retries once the
 * app returns to foreground.
 *
 * Android: Notifee reports DENIED for both "never asked" and "permanently
 * denied", so we use PermissionsAndroid.request(POST_NOTIFICATIONS). Any deny
 * after "Turn on" opens notification settings because the user already signaled
 * intent to enable.
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
          retry().catch(() => {
            /* enable flow logs its own failures */
          });
        },
      );
    },
    [clearForegroundRetry],
  );

  const openSettingsAndScheduleRetry = useCallback(
    (isCurrent: () => boolean) => {
      toastRef?.current?.closeToast();
      // Release the in-flight guard before opening system settings so that a
      // throw from openSystemSettings() can't leave "Turn on" permanently
      // locked. Both iOS and Android reach this helper, so releasing here keeps
      // them consistent. The scheduled foreground retry owns its own guard.
      inFlightRef.current = false;
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
    },
    [runEnableFlow, scheduleForegroundRetry, showLoadingToast, toastRef],
  );

  const runGrantedFlow = useCallback(
    async (isCurrent: () => boolean) => {
      if (!isCurrent()) {
        return;
      }
      showLoadingToast();
      await enableNotifications();
      if (isCurrent()) {
        toastRef?.current?.closeToast();
      }
    },
    [enableNotifications, showLoadingToast, toastRef],
  );

  const runAndroidPermissionFlow = useCallback(
    async (isCurrent: () => boolean) => {
      // Android < 13 has no runtime dialog; when notifications are not already
      // granted they can only be enabled from system settings.
      // openSettingsAndScheduleRetry closes the toast and opens settings, so no
      // loading toast is needed here.
      if (Number(Platform.Version) < ANDROID_POST_NOTIFICATIONS_API_LEVEL) {
        openSettingsAndScheduleRetry(isCurrent);
        return;
      }
      // Android 13+ requires the POST_NOTIFICATIONS runtime permission. Don't
      // show the loading toast before the request — it would sit behind the OS
      // permission dialog.
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!isCurrent()) {
        return;
      }
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        // Show the loading toast only while the enable work runs, after the OS
        // dialog is dismissed.
        showLoadingToast();
        await runEnableFlow(isCurrent);
        return;
      }
      // User tapped Turn on — any deny opens settings (no loading toast).
      openSettingsAndScheduleRetry(isCurrent);
    },
    [openSettingsAndScheduleRetry, runEnableFlow, showLoadingToast],
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
      // OS can still show its dialog — request permission via enableNotifications().
      // If the user denies, dismiss the toast without opening Settings (matches
      // PushNotificationOnboarding).
      showLoadingToast();
      await enableNotifications();
      if (isCurrent()) {
        toastRef?.current?.closeToast();
      }
    },
    [
      enableNotifications,
      openSettingsAndScheduleRetry,
      showLoadingToast,
      toastRef,
    ],
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
    runGrantedFlow,
    runAndroidPermissionFlow,
    runIosPermissionFlow,
    showErrorToast,
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
