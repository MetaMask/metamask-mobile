/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { TRIGGER_TYPES, type Notification } from '../../util/notifications';
import { createDeepEqualSelector } from '../util';
import {
  AuthenticationControllerState,
  UserStorageControllerState,
} from '@metamask/profile-sync-controller';

import { NotificationServicesControllerState } from '@metamask/notification-services-controller';
const selectAuthenticationControllerState = (state: RootState) =>
  state.engine.backgroundState.AuthenticationController;

const selectUserStorageControllerState = (state: RootState) =>
  state.engine.backgroundState.UserStorageController;

const selectNotificationsControllerState = (state: RootState) =>
  state.engine.backgroundState.NotificationServicesController;

const selectNotificationServicesPushControllerState = (state: RootState) =>
  state.engine.backgroundState.NotificationServicesPushController;

export const selectIsSignedIn = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationControllerState) =>
    authenticationControllerState.isSignedIn,
);

export const selectSessionData = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState: AuthenticationControllerState) =>
    authenticationControllerState.sessionData,
);

export const selectIsProfileSyncingEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageControllerState) =>
    userStorageControllerState.isProfileSyncingEnabled,
);

export const selectIsProfileSyncingUpdateLoading = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageControllerState) =>
    userStorageControllerState.isProfileSyncingUpdateLoading,
);

export const selectInternalAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageControllerState) =>
    userStorageControllerState.internalAccounts,
);

export const selectUniqueAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState: UserStorageControllerState) =>
    userStorageControllerState.uniqueAccounts,
);

export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectNotificationServicesPushControllerState,
  (metamaskNotificationsControllerState: NotificationServicesControllerState) =>
    metamaskNotificationsControllerState.isMetamaskNotificationsEnabled,
);

export const selectIsFeatureAnnouncementsEnabled = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isFeatureAnnouncementsEnabled,
);

export const selectIsCheckingAccountsPresence = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isCheckingAccountsPresence,
);

export const selectIsUpdatingMetamaskNotifications = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isUpdatingMetamaskNotifications,
);

export const selectHasSeenNotificationsFeature = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.hasSeenNotificationsFeature,
);

export const selectIsFetchingMetamaskNotification = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isFetchingMetamaskNotification,
);

export const selectIsUpdatingMetamaskNotificationsAccounts = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccounts,
);

export const selectIsUpdatingMetamaskNotificationsAccount = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccount,
);

export const selectNotificationsList = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.metamaskNotificationsList,
);

export const selectNotificationsReadList = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController: NotificationServicesControllerState) =>
    metamaskNotificationsController.metamaskNotificationsReadList,
);

export const getMetamaskNotificationsUnreadCount = createSelector(
  [selectNotificationsControllerState],
  (notifications: Notification[]) =>
    notifications
      ? notifications.filter((notification) => !notification.isRead).length
      : 0,
);

export const getOnChainMetamaskNotificationsUnreadCount = createSelector(
  [selectNotificationsControllerState],
  (notifications: Notification[]) =>
    notifications
      ? notifications.filter(
          (notification) =>
            !notification.isRead &&
            notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
        ).length
      : 0,
);

export const getMetamaskNotificationById = (id: string) =>
  createDeepEqualSelector(
    [selectNotificationsControllerState],
    (notifications: Notification[]): Notification | undefined =>
      notifications.find((notification) => notification.id === id),
  );
