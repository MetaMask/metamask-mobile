/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { NotificationServicesController } from '@metamask-previews/notification-services-controller';
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask-previews/profile-sync-controller';

import { RootState } from '../../reducers';
import { TRIGGER_TYPES } from '../../util/notifications';

import { createDeepEqualSelector } from '../util';

type notificationServicesControllerState =
  typeof NotificationServicesController.defaultState;

// TODO: Export defaultState from AuthenticationController and UserStorageController to follow the same pattern of NotificationServicesController
type authenticationControllerState =
  typeof AuthenticationController.defaultState;

type userStorageControllerState = typeof UserStorageController.defaultState;

const pushNotificationsState = (state: RootState) =>
  state?.engine?.backgroundState?.NotificationServicesController;

export const selectIsMetamaskNotificationsEnabled = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isNotificationServicesEnabled,
);
export const selectIsMetamaskNotificationsFeatureSeen = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isMetamaskNotificationsFeatureSeen,
);
export const selectIsUpdatingMetamaskNotifications = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isUpdatingMetamaskNotifications,
);
export const selectIsFetchingMetamaskNotifications = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isFetchingMetamaskNotifications,
);
export const selectIsFeatureAnnouncementsEnabled = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isFeatureAnnouncementsEnabled,
);
export const selectIsUpdatingMetamaskNotificationsAccount = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isUpdatingMetamaskNotificationsAccount,
);
export const selectIsCheckingAccountsPresence = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.isCheckingAccountsPresence,
);
export const getmetamaskNotificationsReadList = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.metamaskNotificationsReadList,
);
export const getNotificationsList = createDeepEqualSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.metamaskNotificationsList,
);
export const getMetamaskNotificationsUnreadCount = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.metamaskNotificationsList
      ? state.metamaskNotificationsList.filter(
          (notification) => !notification.isRead,
        ).length
      : 0,
);
export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) =>
    state.metamaskNotificationsList
      ? state.metamaskNotificationsList.filter(
          (notification) =>
            !notification.isRead &&
            notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
        ).length
      : 0,
);
export const selectIsSignedIn = createSelector(
  pushNotificationsState,
  (state: authenticationControllerState) => state.isSignedIn,
);
export const selectSessionData = createSelector(
  pushNotificationsState,
  (state: authenticationControllerState) => state.sessionData,
);
export const selectIsProfileSyncingEnabled = createSelector(
  pushNotificationsState,
  (state: userStorageControllerState) => state.isProfileSyncingEnabled,
);
export const selectIsProfileSyncingUpdateLoading = createSelector(
  pushNotificationsState,
  (state: userStorageControllerState) => state.isProfileSyncingUpdateLoading,
);

// TODO: Check the need of these selectors
export const selectUserStorage = createSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) => state.userStorage,
);
export const selectAccountsPresence = createDeepEqualSelector(
  pushNotificationsState,
  (state: notificationServicesControllerState) => state.accounts,
);
