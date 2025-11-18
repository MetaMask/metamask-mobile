import { useCallback } from 'react';
import NotificationService, {
  getPushPermission,
} from '../../../../util/notifications/services/NotificationService';
import { usePushNotificationsToggle } from '../../../../util/notifications/hooks/usePushNotifications';

export function usePushNotificationSettingsToggle() {
  const { data, togglePushNotification, loading } = usePushNotificationsToggle({
    nudgeEnablePush: true,
  });
  const onToggle = useCallback(async () => {
    const perm = await getPushPermission();
    if (perm === 'denied') {
      await NotificationService.openSystemSettings();
      return;
    }

    togglePushNotification(!data);
  }, [data, togglePushNotification]);
  return {
    onToggle,
    value: data,
    loading,
  };
}
