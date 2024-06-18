/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { TRIGGER_TYPES } from '../../util/notifications';

import { IPushNotificationsState } from '../../reducers/pushNotifications';

const selectPushNotificationsState = (state: RootState) =>
  state.pushNotifications;
export const selectIsSignedIn = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.isSignedIn,
);
export const selectSessionData = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.sessionData,
);
export const selectIsProfileSyncingEnabled = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.isProfileSyncingEnabled,
);
export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.isNotificationServicesEnabled,
);
export const selectIsFeatureAnnouncementsEnabled = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.isFeatureAnnouncementsEnabled,
);
export const selectAccountsPresence = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.accounts,
);
export const selectIsMetamaskNotificationsFeatureSeen = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.isMetamaskNotificationsFeatureSeen,
);
export const selectNotificationsList = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.notifications,
);
export const getMetamaskNotificationsUnreadCount = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.notifications
      ? pushNotificationsState.notifications.filter(
          (notification) => !notification.isRead,
        ).length
      : 0,
);
export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
  selectPushNotificationsState,
  (pushNotificationsState: IPushNotificationsState) =>
    pushNotificationsState.notifications
      ? pushNotificationsState.notifications.filter(
          (notification) =>
            !notification.isRead &&
            notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
        ).length
      : 0,
);
