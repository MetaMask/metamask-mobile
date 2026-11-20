import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { toast } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants';
import { useEnableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import NotificationService, {
  getPushPermission,
} from '../../../../util/notifications/services/NotificationService';
import useRewardsToast from './useRewardsToast';

const dismissToast = () => {
  try {
    toast.dismiss();
  } catch {
    // Toaster is registered at app root; ignore if it is not mounted yet.
  }
};

type NotificationsEnabledAction = () => Promise<void> | void;

interface UseRewardsNotificationsNudgeOptions {
  enabled?: boolean;
  onNotificationsEnabled?: () => void;
}

export interface UseRewardsNotificationsNudgeReturn {
  areNotificationsEnabled: boolean;
  canPromptToEnableNotifications: boolean;
  shouldPromptToEnableNotifications: boolean;
  showEnableNotificationsNudge: () => boolean;
  closeEnableNotificationsNudge: () => void;
  runAfterNotificationsEnabled: (
    action: NotificationsEnabledAction,
  ) => Promise<boolean>;
}

/**
 * Shared Rewards notification nudge flow.
 *
 * Screens can either show the nudge directly, or defer an action until
 * MetaMask notifications and push notifications are both enabled.
 */
export function useRewardsNotificationsNudge(
  options: UseRewardsNotificationsNudgeOptions = {},
): UseRewardsNotificationsNudgeReturn {
  const { enabled = true, onNotificationsEnabled } = options;
  const onNotificationsEnabledRef = useRef(onNotificationsEnabled);
  onNotificationsEnabledRef.current = onNotificationsEnabled;
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const isMetaMaskPushNotificationsEnabled = useSelector(
    selectIsMetaMaskPushNotificationsEnabled,
  );
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { enableNotifications } = useEnableNotifications({
    nudgeEnablePush: true,
  });
  const notificationsEnableInFlightRef = useRef(false);
  const pendingActionRef = useRef<NotificationsEnabledAction | null>(null);
  const appStateSubscriptionRef = useRef<ReturnType<
    typeof AppState.addEventListener
  > | null>(null);

  const canPromptToEnableNotifications = isNotificationsFeatureEnabled();
  const areNotificationsEnabled =
    isMetamaskNotificationsEnabled && isMetaMaskPushNotificationsEnabled;
  const shouldPromptToEnableNotifications =
    enabled && canPromptToEnableNotifications && !areNotificationsEnabled;

  // Kept in sync on every render so closeEnableNotificationsNudge can read the
  // latest value without being recreated whenever areNotificationsEnabled changes.
  const areNotificationsEnabledRef = useRef(areNotificationsEnabled);
  areNotificationsEnabledRef.current = areNotificationsEnabled;

  const closeEnableNotificationsNudge = useCallback(() => {
    pendingActionRef.current = null;
    // If notifications are now enabled the nudge is already gone (replaced by
    // loading → success toast). Calling closeToast here would kill the success
    // toast that was just shown, so we skip it.
    if (!areNotificationsEnabledRef.current) {
      dismissToast();
    }
  }, []);

  const handleTurnOnNotifications = useCallback(async () => {
    if (!enabled || notificationsEnableInFlightRef.current) {
      return;
    }
    notificationsEnableInFlightRef.current = true;
    showToast(
      RewardsToastOptions.loading(
        strings('rewards.notifications_nudge.loading'),
        strings('rewards.notifications_nudge.loading_description'),
      ),
    );
    try {
      const permission = await getPushPermission();
      if (permission === 'denied') {
        dismissToast();
        NotificationService.openSystemSettings();
        appStateSubscriptionRef.current = AppState.addEventListener(
          'change',
          async (nextState) => {
            if (nextState !== 'active') return;
            appStateSubscriptionRef.current?.remove();
            appStateSubscriptionRef.current = null;
            const retryPermission = await getPushPermission();
            if (retryPermission === 'denied') return;
            notificationsEnableInFlightRef.current = true;
            showToast(
              RewardsToastOptions.loading(
                strings('rewards.notifications_nudge.loading'),
                strings('rewards.notifications_nudge.loading_description'),
              ),
            );
            try {
              await enableNotifications();
              dismissToast();
              onNotificationsEnabledRef.current?.();
            } catch {
              dismissToast();
              showToast(
                RewardsToastOptions.error(
                  strings('rewards.notifications_nudge.enable_error'),
                ),
              );
            } finally {
              notificationsEnableInFlightRef.current = false;
            }
          },
        );
        return;
      }
      await enableNotifications();
      dismissToast();
      onNotificationsEnabledRef.current?.();
    } catch {
      dismissToast();
      showToast(
        RewardsToastOptions.error(
          strings('rewards.notifications_nudge.enable_error'),
        ),
      );
    } finally {
      notificationsEnableInFlightRef.current = false;
    }
  }, [enableNotifications, enabled, showToast, RewardsToastOptions]);

  const showEnableNotificationsNudge = useCallback(() => {
    if (!shouldPromptToEnableNotifications) {
      return false;
    }

    const nudgeConfig = RewardsToastOptions.enableNotificationsNudge({
      label: strings('rewards.notifications_nudge.turn_on_button'),
      onPress: handleTurnOnNotifications,
    });

    showToast({
      ...nudgeConfig,
      onClose: () => {
        pendingActionRef.current = null;
      },
    });
    return true;
  }, [
    RewardsToastOptions,
    handleTurnOnNotifications,
    shouldPromptToEnableNotifications,
    showToast,
  ]);

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
      showEnableNotificationsNudge();
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
    dismissToast();
    showToast(
      RewardsToastOptions.loading(
        strings('rewards.notifications_nudge.loading'),
        strings('rewards.notifications_nudge.loading_description'),
      ),
    );
    Promise.resolve(pendingAction()).catch(() => {
      dismissToast();
      showToast(
        RewardsToastOptions.error(
          strings('rewards.notifications_nudge.enable_error'),
        ),
      );
    });
  }, [areNotificationsEnabled, enabled, showToast, RewardsToastOptions]);

  useEffect(() => {
    if (!enabled) {
      appStateSubscriptionRef.current?.remove();
      appStateSubscriptionRef.current = null;
      pendingActionRef.current = null;
    }
  }, [enabled]);

  useEffect(
    () => () => {
      appStateSubscriptionRef.current?.remove();
    },
    [],
  );

  return {
    areNotificationsEnabled,
    canPromptToEnableNotifications,
    shouldPromptToEnableNotifications,
    showEnableNotificationsNudge,
    closeEnableNotificationsNudge,
    runAfterNotificationsEnabled,
  };
}
