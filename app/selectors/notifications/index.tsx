import { createSelector } from 'reselect';
import {
  NotificationServicesControllerState,
  TRIGGER_TYPES,
  defaultState as notificationControllerServiceDefaultState,
  INotification,
} from '@metamask/notification-services-controller/notification-services';
import {
  NotificationServicesPushControllerState,
  defaultState as pushControllerDefaultState,
} from '@metamask/notification-services-controller/push-services';

import { createDeepEqualSelector } from '../util';
import { RootState } from '../../reducers';

type NotificationServicesState = NotificationServicesControllerState;

const selectNotificationServicesControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesController ??
  notificationControllerServiceDefaultState;

const selectNotificationServicesPushControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesPushController ??
  pushControllerDefaultState;

export const selectIsMetamaskNotificationsEnabled = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isNotificationServicesEnabled,
);
export const selectIsMetaMaskPushNotificationsEnabled = createDeepEqualSelector(
  selectNotificationServicesPushControllerState,
  (state: NotificationServicesPushControllerState) =>
    Boolean(state.isPushEnabled),
);
export const selectIsMetaMaskPushNotificationsLoading = createDeepEqualSelector(
  selectNotificationServicesPushControllerState,
  (state: NotificationServicesPushControllerState) => state.isUpdatingFCMToken,
);

export const selectIsMetamaskNotificationsFeatureSeen = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isMetamaskNotificationsFeatureSeen,
);
export const selectIsUpdatingMetamaskNotifications = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isUpdatingMetamaskNotifications,
);
export const selectIsFetchingMetamaskNotifications = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isFetchingMetamaskNotifications,
);
export const selectIsFeatureAnnouncementsEnabled = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isFeatureAnnouncementsEnabled,
);
export const selectIsUpdatingMetamaskNotificationsAccount =
  createDeepEqualSelector(
    selectNotificationServicesControllerState,
    (notificationServicesControllerState: NotificationServicesState) =>
      notificationServicesControllerState.isUpdatingMetamaskNotificationsAccount,
  );
export const selectIsCheckingAccountsPresence = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isCheckingAccountsPresence,
);
export const getmetamaskNotificationsReadList = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.metamaskNotificationsReadList,
);
export const getNotificationsList = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.metamaskNotificationsList,
);

export const getMetamaskNotificationsUnreadCount = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      notificationServicesControllerState.metamaskNotificationsList ?? []
    ).filter((notification: INotification) => !notification.isRead).length,
);
export const getMetamaskNotificationsReadCount = createDeepEqualSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      notificationServicesControllerState.metamaskNotificationsList ?? []
    ).filter((notification: INotification) => notification.isRead).length,
);
export const getOnChainMetamaskNotificationsUnreadCount =
  createDeepEqualSelector(
    selectNotificationServicesControllerState,
    (notificationServicesControllerState: NotificationServicesState) =>
      (
        notificationServicesControllerState.metamaskNotificationsList ?? []
      ).filter(
        (notification: INotification) =>
          !notification.isRead &&
          notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
      ).length,
  );
export const getValidNotificationAccounts = createDeepEqualSelector(
  [selectNotificationServicesControllerState],
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.subscriptionAccountsSeen,
);
