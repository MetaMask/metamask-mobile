import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  assertIsFeatureEnabled,
  disablePushNotifications as disablePushNotificationsHelper,
  enablePushNotifications as enablePushNotificationsHelper,
} from '../../../actions/notification/helpers';
import {
  selectIsMetaMaskPushNotificationsEnabled,
  selectIsMetaMaskPushNotificationsLoading,
} from '../../../selectors/notifications';
import {
  hasPushPermission,
  requestPushPermissions,
} from '../services/NotificationService';
import {
  clearPushNotificationStatusCache,
  setCachedNativePermissionEnabled,
} from '../utils/push-notification-status';
import {
  markPushPrePromptPerformance,
  measurePushPrePromptPerformance,
} from '../utils/push-pre-prompt-performance';

export interface UsePushNotificationsToggleProps {
  // Depending on the instance, we may want to nudge to enable push notifications
  // Or skip nudging.
  // E.g. Onboarding = nudge, settings page = don't nudge
  nudgeEnablePush: boolean;
}
export function usePushNotificationsToggle(
  props: UsePushNotificationsToggleProps = { nudgeEnablePush: true },
) {
  const data = useSelector(selectIsMetaMaskPushNotificationsEnabled);
  const loading = useSelector(selectIsMetaMaskPushNotificationsLoading);

  const enablePushNotifications = useCallback(async () => {
    const startedAt = Date.now();
    assertIsFeatureEnabled();
    markPushPrePromptPerformance('push_notifications_toggle.enable.start', {
      nudgeEnablePush: props.nudgeEnablePush,
    });
    const pushPermCallback = props.nudgeEnablePush
      ? requestPushPermissions
      : hasPushPermission;

    const nativePermissionEnabled = await measurePushPrePromptPerformance(
      'push_notifications_toggle.native_permission',
      () => pushPermCallback().catch(() => false),
      { nudgeEnablePush: props.nudgeEnablePush },
    );
    setCachedNativePermissionEnabled(nativePermissionEnabled);
    if (!nativePermissionEnabled) {
      markPushPrePromptPerformance('push_notifications_toggle.enable.end', {
        durationMs: Date.now() - startedAt,
        nativePermissionEnabled,
        result: false,
      });
      return false;
    }

    try {
      await measurePushPrePromptPerformance(
        'push_notifications_toggle.controller_enable',
        enablePushNotificationsHelper,
      );
      markPushPrePromptPerformance('push_notifications_toggle.enable.end', {
        durationMs: Date.now() - startedAt,
        nativePermissionEnabled,
        result: true,
      });
      return true;
    } catch {
      markPushPrePromptPerformance('push_notifications_toggle.enable.end', {
        durationMs: Date.now() - startedAt,
        nativePermissionEnabled,
        result: false,
      });
      return false;
    }
  }, [props.nudgeEnablePush]);

  const disablePushNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    try {
      await disablePushNotificationsHelper();
      clearPushNotificationStatusCache();
      return true;
    } catch {
      return false;
    }
  }, []);

  const togglePushNotification = useCallback(
    async (val: boolean) => val
        ? await enablePushNotifications()
        : await disablePushNotifications(),
    [disablePushNotifications, enablePushNotifications],
  );

  return {
    data,
    togglePushNotification,
    loading,
  };
}
