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
  getPushPermissionStatus,
} from '../../../util/notifications/services/NotificationService';
import { resolveCliLoginPushNudgeTurnOnAction } from '../../../core/AgenticCli/cliLoginPushNudgeRouting';

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
 * QR login (MMAI-925). On "Turn on": when native permission is promptable (or
 * MetaMask in-app notifications are off) it calls enableNotifications(), which
 * enables in-app notifications and requests the OS permission dialog. When
 * native permission is already denied it deep-links to the device notification
 * settings and retries once the app returns to the foreground.
 */
export function useCliLoginPushNudge(): {
  showNudge: () => boolean;
} {
  const { toastRef } = useContext(ToastContext);
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: true,
  });

  const inFlightRef = useRef(false);
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

  const runEnableFlow = useCallback(async () => {
    try {
      await enableNotifications();
      toastRef?.current?.closeToast();
    } catch {
      toastRef?.current?.closeToast();
      showErrorToast();
    }
  }, [enableNotifications, toastRef, showErrorToast]);

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

    try {
      const nativePushStatus = await getPushPermissionStatus();
      const action = resolveCliLoginPushNudgeTurnOnAction({
        nativePushStatus,
      });

      if (action === 'open_device_settings') {
        toastRef?.current?.closeToast();
        NotificationService.openSystemSettings();
        scheduleForegroundRetry(async () => {
          inFlightRef.current = true;
          try {
            const retryStatus = await getPushPermissionStatus();
            if (retryStatus === 'denied') {
              toastRef?.current?.closeToast();
              return;
            }
            showLoadingToast();
            await runEnableFlow();
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

      showLoadingToast();
      await runEnableFlow();
    } catch {
      toastRef?.current?.closeToast();
      showErrorToast();
    } finally {
      if (!appStateSubscriptionRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [
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
    // A new nudge supersedes any in-progress denied-permission flow: cancel a
    // pending foreground retry and release the guard so this toast's Turn on
    // is not blocked and the previous retry cannot fire on the next resume.
    clearForegroundRetry();
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
