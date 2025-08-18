import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
  selectIsMetamaskNotificationsFeatureSeen,
  selectIsUpdatingMetamaskNotifications,
  selectIsFetchingMetamaskNotifications,
  selectIsFeatureAnnouncementsEnabled,
  selectIsPerpsNotificationsEnabled,
  selectIsUpdatingMetamaskNotificationsAccount,
  selectIsCheckingAccountsPresence,
  getmetamaskNotificationsReadList,
  getNotificationsList,
  getMetamaskNotificationsUnreadCount,
  getMetamaskNotificationsReadCount,
  getOnChainMetamaskNotificationsUnreadCount,
  selectIsMetaMaskPushNotificationsLoading,
  getValidNotificationAccounts,
} from './index';
import { RootState } from '../../reducers';
import {
  MOCK_NOTIFICATION_SERVICES_CONTROLLER,
  MOCK_NOTIFICATION_SERVICES_PUSH_CONTROLLER,
} from './testUtils';

describe('Notification Selectors', () => {
  const mockState = {
    engine: {
      backgroundState: {
        NotificationServicesController: MOCK_NOTIFICATION_SERVICES_CONTROLLER,
        NotificationServicesPushController:
          MOCK_NOTIFICATION_SERVICES_PUSH_CONTROLLER,
      },
    },
  } as unknown as RootState;

  it('selectIsMetamaskNotificationsEnabled returns correct value', () => {
    expect(selectIsMetamaskNotificationsEnabled(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isNotificationServicesEnabled,
    );
  });

  it('selectIsMetaMaskPushNotificationsEnabled returns correct value', () => {
    expect(selectIsMetaMaskPushNotificationsEnabled(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_PUSH_CONTROLLER.isPushEnabled,
    );
  });

  it('selectIsMetaMaskPushNotificationsLoading returns correct value', () => {
    expect(selectIsMetaMaskPushNotificationsLoading(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_PUSH_CONTROLLER.isUpdatingFCMToken,
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

  it('selectIsPerpsNotificationsEnabled returns correct value', () => {
    expect(selectIsPerpsNotificationsEnabled(mockState)).toEqual(
      MOCK_NOTIFICATION_SERVICES_CONTROLLER.isPerpsNotificationsEnabled,
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

  it('getValidNotificationAccounts selects the valid accounts that can enable notifications', () => {
    const state = { ...mockState };
    state.engine.backgroundState.NotificationServicesController.subscriptionAccountsSeen =
      ['0x1111'];
    expect(getValidNotificationAccounts(state)).toStrictEqual(['0x1111']);
  });

  it('getValidNotificationAccounts returns same reference when called with same state', () => {
    const state = { ...mockState };
    state.engine.backgroundState.NotificationServicesController.subscriptionAccountsSeen =
      ['0x1111'];

    const result1 = getValidNotificationAccounts(state);
    const result2 = getValidNotificationAccounts(state);
    expect(result1 === result2).toBe(true);
  });
});
