import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  assertIsFeatureEnabled,
  disablePushNotifications as disablePushNotificationsHelper,
  enablePushNotifications as enablePushNotificationsHelper,
} from '../../../actions/notification/helpers';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import {
  hasPushPermission,
  requestPushPermissions,
} from '../services/NotificationService';

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
  const [loading, setLoading] = useState(false);

  const enablePushNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setLoading(true);
    const pushPermCallback = props.nudgeEnablePush
      ? requestPushPermissions
      : hasPushPermission;

    const result = await pushPermCallback().catch(() => false);
    if (!result) return;

    await enablePushNotificationsHelper().catch(() => {
      /* Do Nothing */
    });

    setLoading(false);
  }, [props.nudgeEnablePush]);

  const disablePushNotifications = useCallback(async () => {
    assertIsFeatureEnabled();
    setLoading(true);
    await disablePushNotificationsHelper().catch(() => {
      /* Do Nothing */
    });
    setLoading(false);
  }, []);

  const togglePushNotification = useCallback(
    async (val: boolean) => {
      val ? await enablePushNotifications() : await disablePushNotifications();
    },
    [disablePushNotifications, enablePushNotifications],
  );

  return {
    data,
    togglePushNotification,
    loading,
  };
}
