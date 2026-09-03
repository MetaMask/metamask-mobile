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
import { pushStartupLog } from '../utils/push-startup-log';

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
    assertIsFeatureEnabled();
    const pushPermCallback = props.nudgeEnablePush
      ? requestPushPermissions
      : hasPushPermission;

    pushStartupLog('enablePushNotifications: checking native permission', {
      nudgeEnablePush: props.nudgeEnablePush,
      strategy: props.nudgeEnablePush
        ? 'requestPushPermissions'
        : 'hasPushPermission',
    });
    const nativePermissionEnabled = await pushPermCallback().catch(() => false);
    pushStartupLog('enablePushNotifications: native permission result', {
      nativePermissionEnabled,
    });
    if (!nativePermissionEnabled) {
      return false;
    }

    try {
      await enablePushNotificationsHelper();
      pushStartupLog('enablePushNotifications: controller push enabled');
      return true;
    } catch (error) {
      pushStartupLog('enablePushNotifications: controller enable failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [props.nudgeEnablePush]);

  const disablePushNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    try {
      await disablePushNotificationsHelper();
      return true;
    } catch {
      return false;
    }
  }, []);

  const togglePushNotification = useCallback(
    async (val: boolean) =>
      val ? await enablePushNotifications() : await disablePushNotifications(),
    [disablePushNotifications, enablePushNotifications],
  );

  return {
    data,
    togglePushNotification,
    loading,
  };
}
