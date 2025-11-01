import { defaultState } from '@metamask/notification-services-controller/push-services';
import MOCK_NOTIFICATIONS from '../../components/UI/Notification/__mocks__/mock_notifications';

export const MOCK_NOTIFICATION_SERVICES_CONTROLLER = {
  isNotificationServicesEnabled: true,
  isMetamaskNotificationsFeatureSeen: true,
  isUpdatingMetamaskNotifications: false,
  isFetchingMetamaskNotifications: false,
  isFeatureAnnouncementsEnabled: true,
  isPerpsNotificationsEnabled: false,
  isUpdatingMetamaskNotificationsAccount: false,
  isCheckingAccountsPresence: false,
  metamaskNotificationsReadList: [],
  metamaskNotificationsList: MOCK_NOTIFICATIONS,
};

export const MOCK_NOTIFICATION_SERVICES_PUSH_CONTROLLER = {
  ...defaultState,
  isPushEnabled: true,
};
