/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { TRIGGER_TYPES, type Notification } from 'app/util/notifications';
import { createDeepEqualSelector } from '../util';
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
  (authenticationControllerState) => authenticationControllerState.isSignedIn,
);

export const selectSessionData = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState) => authenticationControllerState.sessionData,
);

export const selectIsProfileSyncingEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) =>
    userStorageControllerState.isProfileSyncingEnabled,
);

export const selectIsProfileSyncingUpdateLoading = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) =>
    userStorageControllerState.isProfileSyncingUpdateLoading,
);

export const selectInternalAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) => userStorageControllerState.internalAccounts,
);

export const selectUniqueAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) => userStorageControllerState.uniqueAccounts,
);

export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectNotificationServicesPushControllerState,
  (metamaskNotificationsControllerState) =>
    metamaskNotificationsControllerState.isMetamaskNotificationsEnabled,
);

export const selectIsFeatureAnnouncementsEnabled = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isFeatureAnnouncementsEnabled,
);

export const selectIsCheckingAccountsPresence = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isCheckingAccountsPresence,
);

export const selectIsUpdatingMetamaskNotifications = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotifications,
);

export const selectHasSeenNotificationsFeature = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.hasSeenNotificationsFeature,
);

export const selectIsFetchingMetamaskNotification = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isFetchingMetamaskNotification,
);

export const selectIsUpdatingMetamaskNotificationsAccounts = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccounts,
);

export const selectIsUpdatingMetamaskNotificationsAccount = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccount,
);

export const selectNotificationsList = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.metamaskNotificationsList,
);

export const selectNotificationsReadList = createSelector(
  selectNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.metamaskNotificationsReadList,
);

export const getMetamaskNotificationById = (id: string) =>
  createDeepEqualSelector(
    [selectNotificationsControllerState],
    (notifications: Notification[]): Notification | undefined =>
      notifications.find((notification) => notification.id === id),
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
