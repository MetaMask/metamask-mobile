import { useSelector } from 'react-redux';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../util/notifications';

export const useHasUnreadNotifications = (): boolean => {
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  return (
    isNotificationsFeatureEnabled() &&
    isNotificationEnabled &&
    unreadNotificationCount > 0
  );
};
