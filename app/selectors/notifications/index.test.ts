import {
  selectIsProfileSyncingEnabled,
  selectIsProfileSyncingUpdateLoading,
  selectIsSignedIn,
  selectSessionData,
  selectIsMetamaskNotificationsEnabled,
  selectIsMetamaskNotificationsFeatureSeen,
  selectIsUpdatingMetamaskNotifications,
  selectIsFetchingMetamaskNotifications,
  selectIsFeatureAnnouncementsEnabled,
  selectIsUpdatingMetamaskNotificationsAccount,
  selectIsCheckingAccountsPresence,
  getmetamaskNotificationsReadList,
  getNotificationsList,
  getMetamaskNotificationsUnreadCount,
  getMetamaskNotificationsReadCount,
  getOnChainMetamaskNotificationsUnreadCount,
} from './index';
import { RootState } from '../../reducers';
import {
  MOCK_AUTHENTICATION_CONTROLLER,
  MOCK_USER_STORAGE_CONTROLLER,
  MOCK_NOTIFICATION_SERVICES_CONTROLLER,
} from './testUtils';
import { TRIGGER_TYPES } from '../../util/notifications';

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        AuthenticationController: MOCK_AUTHENTICATION_CONTROLLER,
        UserStorageController: MOCK_USER_STORAGE_CONTROLLER,
        NotificationServicesController: MOCK_NOTIFICATION_SERVICES_CONTROLLER,
      },
    },
  } as unknown as RootState;

  it('selectIsProfileSyncingEnabled returns correct value', () => {
    expect(selectIsProfileSyncingEnabled(mockState)).toEqual(
      MOCK_USER_STORAGE_CONTROLLER.isProfileSyncingEnabled,
    );
  });

  it('selectIsProfileSyncingUpdateLoading returns correct value', () => {
    expect(selectIsProfileSyncingUpdateLoading(mockState)).toEqual(
      MOCK_USER_STORAGE_CONTROLLER.isProfileSyncingUpdateLoading,
    );
  });

  it('selectIsSignedIn returns correct value', () => {
    expect(selectIsSignedIn(mockState)).toEqual(
      MOCK_AUTHENTICATION_CONTROLLER.isSignedIn,
    );
  });

  it('selectSessionData returns correct value', () => {
    expect(selectSessionData(mockState)).toEqual(
      MOCK_AUTHENTICATION_CONTROLLER.sessionData,
    );
  });

  it('selectIsMetamaskNotificationsEnabled returns correct value', () => {
    expect(selectIsMetamaskNotificationsEnabled(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isNotificationServicesEnabled,
    );
  });

  it('selectIsMetamaskNotificationsFeatureSeen returns correct value', () => {
    expect(selectIsMetamaskNotificationsFeatureSeen(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isMetamaskNotificationsFeatureSeen,
    );
  });

  it('selectIsUpdatingMetamaskNotifications returns correct value', () => {
    expect(selectIsUpdatingMetamaskNotifications(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isUpdatingMetamaskNotifications,
    );
  });

  it('selectIsFetchingMetamaskNotifications returns correct value', () => {
    expect(selectIsFetchingMetamaskNotifications(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isFetchingMetamaskNotifications,
    );
  });

  it('selectIsFeatureAnnouncementsEnabled returns correct value', () => {
    expect(selectIsFeatureAnnouncementsEnabled(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isFeatureAnnouncementsEnabled,
    );
  });

  it('selectIsUpdatingMetamaskNotificationsAccount returns correct value', () => {
    expect(selectIsUpdatingMetamaskNotificationsAccount(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isUpdatingMetamaskNotificationsAccount,
    );
  });

  it('selectIsCheckingAccountsPresence returns correct value', () => {
    expect(selectIsCheckingAccountsPresence(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isCheckingAccountsPresence,
    );
  });

  it('getmetamaskNotificationsReadList returns correct value', () => {
    expect(getmetamaskNotificationsReadList(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.metamaskNotificationsReadList,
    );
  });

  it('getNotificationsList returns correct value', () => {
    expect(getNotificationsList(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.metamaskNotificationsList,
    );
  });

  it('getMetamaskNotificationsUnreadCount returns correct value', () => {
    const unreadCount =
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.metamaskNotificationsList.filter(
        (notification) => !notification.isRead,
      ).length;
    expect(getMetamaskNotificationsUnreadCount(mockState)).toEqual(unreadCount);
  });

  it('getMetamaskNotificationsReadCount returns correct value', () => {
    const readCount =
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.metamaskNotificationsList.filter(
        (notification) => notification.isRead,
      ).length;
    expect(getMetamaskNotificationsReadCount(mockState)).toEqual(readCount);
  });

  it('getOnChainMetamaskNotificationsUnreadCount returns correct value', () => {
    const unreadOnChainCount =
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.metamaskNotificationsList.filter(
        (notification) =>
          !notification.isRead &&
          notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      ).length;
    expect(getOnChainMetamaskNotificationsUnreadCount(mockState)).toEqual(
      unreadOnChainCount,
    );
  });
});
