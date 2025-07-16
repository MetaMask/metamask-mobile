import { createSelector } from 'reselect';
import {
  NotificationServicesControllerState,
  TRIGGER_TYPES,
  defaultState as notificationControllerServiceDefaultState,
  INotification,
  processNotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationEthSent,
  createMockNotificationEthReceived,
  createMockNotificationERC20Sent,
  createMockNotificationERC20Received,
  createMockNotificationERC721Sent,
  createMockNotificationERC721Received,
  createMockNotificationERC1155Sent,
  createMockNotificationERC1155Received,
  createMockNotificationLidoReadyToBeWithdrawn,
  createMockNotificationLidoStakeCompleted,
  createMockNotificationLidoWithdrawalCompleted,
  createMockNotificationLidoWithdrawalRequested,
  createMockNotificationMetaMaskSwapsCompleted,
  createMockNotificationRocketPoolStakeCompleted,
  createMockNotificationRocketPoolUnStakeCompleted,
  createMockFeatureAnnouncementRaw,
} from '@metamask/notification-services-controller/notification-services/mocks';
import {
  NotificationServicesPushControllerState,
  defaultState as pushControllerDefaultState,
} from '@metamask/notification-services-controller/push-services';

import { createDeepEqualSelector } from '../util';
import { RootState } from '../../reducers';

const mockNotifications = [
  createMockNotificationEthSent(),
  createMockNotificationEthReceived(),
  createMockNotificationERC20Sent(),
  createMockNotificationERC20Received(),
  createMockNotificationERC721Sent(),
  createMockNotificationERC721Received(),
  createMockNotificationERC1155Sent(),
  createMockNotificationERC1155Received(),
  createMockNotificationLidoReadyToBeWithdrawn(),
  createMockNotificationLidoStakeCompleted(),
  createMockNotificationLidoWithdrawalCompleted(),
  createMockNotificationLidoWithdrawalRequested(),
  createMockNotificationMetaMaskSwapsCompleted(),
  createMockNotificationRocketPoolStakeCompleted(),
  createMockNotificationRocketPoolUnStakeCompleted(),
  createMockFeatureAnnouncementRaw(),
].map((n) => processNotification(n));

type NotificationServicesState = NotificationServicesControllerState;

const selectNotificationServicesControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesController ??
  notificationControllerServiceDefaultState;

const selectNotificationServicesPushControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesPushController ??
  pushControllerDefaultState;

export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isNotificationServicesEnabled,
);
export const selectIsMetaMaskPushNotificationsEnabled = createSelector(
  selectNotificationServicesPushControllerState,
  (state: NotificationServicesPushControllerState) =>
    Boolean(state.isPushEnabled),
);
export const selectIsMetaMaskPushNotificationsLoading = createSelector(
  selectNotificationServicesPushControllerState,
  (state: NotificationServicesPushControllerState) => state.isUpdatingFCMToken,
);

export const selectIsMetamaskNotificationsFeatureSeen = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isMetamaskNotificationsFeatureSeen,
);
export const selectIsUpdatingMetamaskNotifications = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isUpdatingMetamaskNotifications,
);
export const selectIsFetchingMetamaskNotifications = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isFetchingMetamaskNotifications,
);
export const selectIsFeatureAnnouncementsEnabled = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isFeatureAnnouncementsEnabled,
);
export const selectIsUpdatingMetamaskNotificationsAccount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isUpdatingMetamaskNotificationsAccount,
);
export const selectIsCheckingAccountsPresence = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isCheckingAccountsPresence,
);
export const getmetamaskNotificationsReadList = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.metamaskNotificationsReadList,
);
export const getNotificationsList = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    mockNotifications ??
    notificationServicesControllerState.metamaskNotificationsList,
);

export const getMetamaskNotificationsUnreadCount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      mockNotifications ??
      notificationServicesControllerState.metamaskNotificationsList ??
      []
    ).filter((notification: INotification) => !notification.isRead).length,
);
export const getMetamaskNotificationsReadCount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      mockNotifications ??
      notificationServicesControllerState.metamaskNotificationsList ??
      []
    ).filter((notification: INotification) => notification.isRead).length,
);
export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      mockNotifications ??
      notificationServicesControllerState.metamaskNotificationsList ??
      []
    ).filter(
      (notification: INotification) =>
        !notification.isRead &&
        notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
    ).length,
);
export const getValidNotificationAccounts = createSelector(
  [selectNotificationServicesControllerState],
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.subscriptionAccountsSeen,
);
