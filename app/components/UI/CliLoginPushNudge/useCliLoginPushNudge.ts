import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { isNotificationsFeatureEnabled } from '../../../util/notifications/constants';
import { useEnableNotifications } from '../../../util/notifications/hooks/useNotifications';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../util/notifications/services/NotificationService';
import { subscribeCliLoginPushNudge } from '../../../core/AgenticCli/cliLoginPushNudgeSignal';
import logger from '../../../core/SDKConnectV2/services/logger';

/** Below this threshold, Android likely skipped the OS dialog (permanent deny). */
const ANDROID_OS_DIALOG_MIN_ELAPSED_MS = 800;

/**
 * Drives the post-CLI-login push-permission bottom sheet (MMAI-925). Subscribes
 * to the module-level nudge signal to become visible after a successful login.
 * On "Enable notifications": requests OS permission when needed, opens device
 * notification settings when the OS dialog can no longer be shown, and enables
 * MetaMask in-app notifications once native push is granted.
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
  const flowEpochRef = useRef(0);
  const appStateSubscriptionRef = useRef<ReturnType<
    typeof AppState.addEventListener
  > | null>(null);

  const clearForegroundRetry = useCallback(() => {
    appStateSubscriptionRef.current?.remove();
    appStateSubscriptionRef.current = null;
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
          retry().catch(() => {
            /* enable flow logs its own failures */
          });
        },
      );
    },
    [clearForegroundRetry],
  );

  const runEnableNotifications = useCallback(async () => {
    try {
      await enableNotifications();
    } catch (error) {
      logger.warn('Failed to enable notifications from CLI login nudge', error);
    }
  }, [enableNotifications]);

  const openSettingsAndScheduleRetry = useCallback(
    (isCurrent: () => boolean) => {
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
      inFlightRef.current = false;
    },
    [runEnableNotifications, scheduleForegroundRetry],
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
        if (!isCurrent()) {
          return;
        }
        await runEnableNotifications();
        return;
      }
      if (!isCurrent()) {
        return;
      }

      if (Platform.OS === 'android') {
        const requestStartedAt = Date.now();
        const osGranted = await requestPushPermissions();
        const requestElapsedMs = Date.now() - requestStartedAt;

        if (!isCurrent()) {
          return;
        }

        if (osGranted) {
          await runEnableNotifications();
          return;
        }

        if (requestElapsedMs < ANDROID_OS_DIALOG_MIN_ELAPSED_MS) {
          openSettingsAndScheduleRetry(isCurrent);
          return;
        }

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

      await runEnableNotifications();
    } finally {
      if (!appStateSubscriptionRef.current) {
        inFlightRef.current = false;
      }
    }
  }, [openSettingsAndScheduleRetry, runEnableNotifications]);

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
