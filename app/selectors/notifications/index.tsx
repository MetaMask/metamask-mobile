/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

const selectAuthenticationControllerState = (state: RootState) =>
  state.engine.backgroundState.AuthenticationController;

const selectUserStorageControllerState = (state: RootState) =>
  state.engine.backgroundState.UserStorageController;

const selectMetamaskNotificationsControllerState = (state: RootState) =>
  state.engine.backgroundState.MetamaskNotificationsController;

const selectMetaMetricsControllerState = (state: RootState) =>
  state.engine.backgroundState.MetaMetricsController;

export const selectIsSignedIn = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState) => authenticationControllerState.isSignedIn,
);

export const selectIsProfileSyncingEnabled = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) =>
    userStorageControllerState.isProfileSyncingEnabled,
);

export const selectIsParticipatingInMetaMetrics = createSelector(
  selectMetaMetricsControllerState,
  (metaMetricsControllerState) =>
    metaMetricsControllerState.isParticipatingInMetaMetrics,
);

export const selectIsMetamaskNotificationsEnabled = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsControllerState) =>
    metamaskNotificationsControllerState.isMetamaskNotificationsEnabled,
);

export const selectIsFeatureAnnouncementsEnabled = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isFeatureAnnouncementsEnabled,
);

export const selectIsCheckingAccountsPresence = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isCheckingAccountsPresence,
);

export const selectIsUpdatingMetamaskNotifications = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotifications,
);

export const selectHasSeenNotificationsFeature = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.hasSeenNotificationsFeature,
);

export const selectIsFetchingMetamaskNotification = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isFetchingMetamaskNotification,
);

export const selectIsUpdatingMetamaskNotificationsAccounts = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccounts,
);

export const selectIsUpdatingMetamaskNotificationsAccount = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.isUpdatingMetamaskNotificationsAccount,
);

export const selectSessionData = createSelector(
  selectAuthenticationControllerState,
  (authenticationControllerState) => authenticationControllerState.sessionData,
);

export const selectInternalAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) => userStorageControllerState.internalAccounts,
);

export const selectUniqueAccounts = createSelector(
  selectUserStorageControllerState,
  (userStorageControllerState) => userStorageControllerState.uniqueAccounts,
);

export const selectNotificationsList = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.metamaskNotificationsList,
);

export const selectNotificationsReadList = createSelector(
  selectMetamaskNotificationsControllerState,
  (metamaskNotificationsController) =>
    metamaskNotificationsController.metamaskNotificationsReadList,
);
