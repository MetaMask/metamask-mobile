import { useCallback } from 'react';
import { usePushNotificationsToggle } from '../../../../util/notifications/hooks/usePushNotifications';

export function usePushNotificationSettingsToggle() {
  const { data, togglePushNotification, loading } = usePushNotificationsToggle({
    nudgeEnablePush: true,
  });
  const onToggle = useCallback(
    () => togglePushNotification(!data),
    [data, togglePushNotification],
  );
  return {
    onToggle,
    value: data,
    loading,
  };
}
