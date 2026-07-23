import { useCallback, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
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

      const promptable = await isPushPermissionPromptable();
      if (!isCurrent()) {
        return;
      }

      if (!promptable) {
        // OS dialog cannot be shown again (e.g. iOS after a prior denial).
        // Deep-link to device settings and retry on return to foreground.
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
        // The enable work is deferred to the foreground retry, which manages
        // its own in-flight guard. Release the guard now so a later tap is not
        // permanently blocked if the user never returns from device settings.
        inFlightRef.current = false;
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
    runEnableFlow,
    scheduleForegroundRetry,
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
