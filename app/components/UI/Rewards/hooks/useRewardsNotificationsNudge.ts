import { useCallback, useContext, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { ToastContext } from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import useRewardsToast from './useRewardsToast';

type NotificationsEnabledAction = () => Promise<void> | void;

interface UseRewardsNotificationsNudgeOptions {
  enabled?: boolean;
}

interface ShowEnableNotificationsNudgeOptions {
  closeToastOnEnableResolved?: boolean;
}

/**
 * Shared Rewards notification nudge flow.
 *
 * Screens can either show the nudge directly, or defer an action until
 * MetaMask notifications and push notifications are both enabled.
 */
export function useRewardsNotificationsNudge(
  options: UseRewardsNotificationsNudgeOptions = {},
): {
  areNotificationsEnabled: boolean;
  canPromptToEnableNotifications: boolean;
  shouldPromptToEnableNotifications: boolean;
  showEnableNotificationsNudge: (
    options?: ShowEnableNotificationsNudgeOptions,
  ) => boolean;
  closeEnableNotificationsNudge: () => void;
  runAfterNotificationsEnabled: (
    action: NotificationsEnabledAction,
  ) => Promise<boolean>;
} {
  const { enabled = true } = options;
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isMetaMaskPushNotificationsEnabled = useSelector(
    selectIsMetaMaskPushNotificationsEnabled,
  );
  const { toastRef } = useContext(ToastContext);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { enableNotifications, loading: isEnablingNotifications } =
    useEnableNotifications({ nudgeEnablePush: true });
  const notificationsEnableInFlightRef = useRef(false);
  const pendingActionRef = useRef<NotificationsEnabledAction | null>(null);
  const closeToastOnEnableResolvedRef = useRef(true);

  const canPromptToEnableNotifications = isNotificationsFeatureEnabled();
  const areNotificationsEnabled =
    isMetamaskNotificationsEnabled && isMetaMaskPushNotificationsEnabled;
  const shouldPromptToEnableNotifications =
    enabled && canPromptToEnableNotifications && !areNotificationsEnabled;

  const closeEnableNotificationsNudge = useCallback(() => {
    pendingActionRef.current = null;
    toastRef?.current?.closeToast();
  }, [toastRef]);

  const handleTurnOnNotifications = useCallback(async () => {
    if (
      !enabled ||
      isEnablingNotifications ||
      notificationsEnableInFlightRef.current
    ) {
      return;
    }
    notificationsEnableInFlightRef.current = true;
    try {
      await enableNotifications();
      if (closeToastOnEnableResolvedRef.current) {
        toastRef?.current?.closeToast();
      }
    } catch {
      // Intentionally empty — same pattern as existing notification nudges.
    } finally {
      notificationsEnableInFlightRef.current = false;
    }
  }, [enableNotifications, enabled, isEnablingNotifications, toastRef]);

  const showEnableNotificationsNudge = useCallback(
    (nudgeOptions?: ShowEnableNotificationsNudgeOptions) => {
      if (!shouldPromptToEnableNotifications) {
        return false;
      }

      closeToastOnEnableResolvedRef.current =
        nudgeOptions?.closeToastOnEnableResolved ?? true;

      const nudgeConfig = RewardsToastOptions.enableNotificationsNudge({
        label: strings('rewards.notifications_nudge.turn_on_button'),
        onPress: handleTurnOnNotifications,
      });

      showToast(
        nudgeConfig.closeButtonOptions
          ? {
              ...nudgeConfig,
              closeButtonOptions: {
                ...nudgeConfig.closeButtonOptions,
                onPress: () => {
                  pendingActionRef.current = null;
                  nudgeConfig.closeButtonOptions?.onPress?.();
                },
              },
            }
          : nudgeConfig,
      );
      return true;
    },
    [
      RewardsToastOptions,
      handleTurnOnNotifications,
      shouldPromptToEnableNotifications,
      showToast,
    ],
  );

  const runAfterNotificationsEnabled = useCallback(
    async (action: NotificationsEnabledAction) => {
      if (!enabled) {
        return false;
      }
      if (areNotificationsEnabled) {
        await action();
        return true;
      }
      if (!canPromptToEnableNotifications) {
        return false;
      }

      pendingActionRef.current = action;
      showEnableNotificationsNudge({ closeToastOnEnableResolved: false });
      return false;
    },
    [
      areNotificationsEnabled,
      canPromptToEnableNotifications,
      enabled,
      showEnableNotificationsNudge,
    ],
  );

  useEffect(() => {
    if (!pendingActionRef.current || !areNotificationsEnabled || !enabled) {
      return;
    }

    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    toastRef?.current?.closeToast();
    Promise.resolve(pendingAction()).catch(() => undefined);
  }, [areNotificationsEnabled, enabled, toastRef]);

  useEffect(() => {
    if (!enabled) {
      pendingActionRef.current = null;
    }
  }, [enabled]);

  return {
    areNotificationsEnabled,
    canPromptToEnableNotifications,
    shouldPromptToEnableNotifications,
    showEnableNotificationsNudge,
    closeEnableNotificationsNudge,
    runAfterNotificationsEnabled,
  };
}
