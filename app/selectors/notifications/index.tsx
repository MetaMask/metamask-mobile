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
import { selectRemoteFeatureFlags } from '../featureFlagController';
import featureAnnouncement, {
  isFilteredFeatureAnnonucementNotification,
} from '../../util/notifications/notification-states/feature-announcement/feature-announcement';

type NotificationServicesState = NotificationServicesControllerState;

const selectNotificationServicesControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesController ??
  notificationControllerServiceDefaultState;

const selectNotificationServicesPushControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesPushController ??
  pushControllerDefaultState;

export const getIsNotificationEnabledByDefaultFeatureFlag = createSelector(
  [selectRemoteFeatureFlags],
  (remoteFlags) => Boolean(remoteFlags?.assetsEnableNotificationsByDefault),
);

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
export const selectIsPerpsNotificationsEnabled = createSelector(
  selectNotificationServicesControllerState,
  (notificationServicesControllerState: NotificationServicesState) =>
    // @ts-expect-error - isPerpsNotificationsEnabled not yet implemented
    notificationServicesControllerState.isPerpsNotificationsEnabled,
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
  (notificationServicesControllerState: NotificationServicesState) => {
    const notificationList =
      notificationServicesControllerState.metamaskNotificationsList;

    return notificationList.filter((n) => {
      // Check announcements
      if (featureAnnouncement.guardFn(n)) {
        return isFilteredFeatureAnnonucementNotification(n);
      }

      // Return rest
      return true;
    });
  },
);

export const getMetamaskNotificationsUnreadCount = createSelector(
  getNotificationsList,
  (metamaskNotificationsList) =>
    (metamaskNotificationsList ?? []).filter(
      (notification: INotification) => !notification.isRead,
    ).length,
);
export const getMetamaskNotificationsReadCount = createSelector(
  getNotificationsList,
  (metamaskNotificationsList) =>
    (metamaskNotificationsList ?? []).filter(
      (notification: INotification) => notification.isRead,
    ).length,
);
export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
  getNotificationsList,
  (metamaskNotificationsList) =>
    (metamaskNotificationsList ?? []).filter(
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
