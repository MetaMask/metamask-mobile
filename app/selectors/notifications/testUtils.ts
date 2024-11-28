import MOCK_NOTIFICATIONS from '../../components/UI/Notification/__mocks__/mock_notifications';

export const MOCK_AUTHENTICATION_CONTROLLER = {
  isSignedIn: true,
  sessionData: {
    userId: '12345',
    token: 'abcdef',
  },
};

export const MOCK_USER_STORAGE_CONTROLLER = {
  isProfileSyncingEnabled: true,
  isProfileSyncingUpdateLoading: false,
};

export const MOCK_NOTIFICATION_SERVICES_CONTROLLER = {
  isNotificationServicesEnabled: true,
  isMetamaskNotificationsFeatureSeen: true,
  isUpdatingMetamaskNotifications: false,
  isFetchingMetamaskNotifications: false,
  isFeatureAnnouncementsEnabled: true,
  isUpdatingMetamaskNotificationsAccount: false,
  isCheckingAccountsPresence: false,
  metamaskNotificationsReadList: [],
  metamaskNotificationsList: MOCK_NOTIFICATIONS,
};
