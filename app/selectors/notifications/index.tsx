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

export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    notificationServicesControllerState.isNotificationServicesEnabled,
);
/**
 * TEMP - update controller to get up-to-date state
 */
export const selectIsMetaMaskPushNotificationsEnabled = createSelector(
  selectNotificationServicesPushControllerState,
  (state: NotificationServicesPushControllerState) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((state as any)?.isPushEnabled),
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
    notificationServicesControllerState.metamaskNotificationsList,
);

export const getMetamaskNotificationsUnreadCount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      notificationServicesControllerState.metamaskNotificationsList ?? []
    ).filter((notification: INotification) => !notification.isRead).length,
);
export const getMetamaskNotificationsReadCount = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    (
      notificationServicesControllerState.metamaskNotificationsList ?? []
    ).filter((notification: INotification) => notification.isRead).length,
);
export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
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
