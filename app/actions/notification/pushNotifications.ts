import { Dispatch } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { getErrorMessage } from '@metamask/utils';

import { notificationsAction, notificationsErrors } from './helpers/constants';
import Engine from '../../core/Engine';
import { Notification } from '../../util/notifications';
import { RootState } from '../../reducers';
import { NotificationsActionTypes } from './helpers/types';

const {
  AuthenticationController,
  UserStorageController,
  NotificationServicesController,
} = Engine.context;

type ThunkDispatchReturn = ThunkAction<
  Promise<string | undefined>,
  RootState,
  unknown,
  NotificationsActionTypes
>;
type MarkAsReadNotificationsParam = Pick<
  Notification,
  'id' | 'type' | 'isRead'
>[];

export const signIn = (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
  try {
    const accessToken = await AuthenticationController.performSignIn();
    if (!accessToken) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }

    const profile = await AuthenticationController.getSessionProfile();

    if (!profile) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }

    dispatch({
      type: notificationsAction.PERFORM_SIGN_IN,
      payload: { accessToken, profile },
    });
  } catch (error) {
    return getErrorMessage(error);
  }
};
export const signOut =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      await AuthenticationController.performSignOut();
      dispatch({
        type: notificationsAction.PERFORM_SIGN_OUT,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const enableProfileSyncing =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      await UserStorageController.enableProfileSyncing();
      dispatch({
        type: notificationsAction.ENABLE_PROFILE_SYNCING,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const disableProfileSyncing =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      await UserStorageController.disableProfileSyncing();
      dispatch({
        type: notificationsAction.DISABLE_PROFILE_SYNCING,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const enableNotificationServices =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      await NotificationServicesController.enableMetamaskNotifications();
      dispatch({
        type: notificationsAction.ENABLE_NOTIFICATIONS_SERVICES,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const disableNotificationServices =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      await NotificationServicesController.disableNotificationServices();
      dispatch({
        type: notificationsAction.DISABLE_NOTIFICATIONS_SERVICES,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const checkAccountsPresence =
  (accounts: string[]): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      const { presence } =
        await NotificationServicesController.checkAccountsPresence(accounts);
      if (!presence) {
        return getErrorMessage(notificationsErrors.CHECK_ACCOUNTS_PRESENCE);
      }
      dispatch({
        type: notificationsAction.CHECK_ACCOUNTS_PRESENCE,
        payload: { presence },
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const deleteOnChainTriggersByAccount =
  (accounts: string[]): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      const { userStorage } =
        await NotificationServicesController.deleteOnChainTriggersByAccount(
          accounts,
        );
      if (!userStorage) {
        return getErrorMessage(
          notificationsErrors.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
        );
      }
      dispatch({
        type: notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
        payload: { userStorage },
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const updateOnChainTriggersByAccount =
  (accounts: string[]): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      const { userStorage } =
        await NotificationServicesController.updateOnChainTriggersByAccount(
          accounts,
        );
      if (!userStorage) {
        return getErrorMessage(
          notificationsErrors.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
        );
      }
      dispatch({
        type: notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
        payload: { userStorage },
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const setFeatureAnnouncementsEnabled =
  (featureAnnouncementsEnabled: boolean): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      await NotificationServicesController.setFeatureAnnouncementsEnabled(
        featureAnnouncementsEnabled,
      );
      dispatch({
        type: notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const setSnapNotificationsEnabled =
  (snapNotificationsEnabled: boolean): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      dispatch({
        type: notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED,
        payload: { result: snapNotificationsEnabled },
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const setMetamaskNotificationsFeatureSeen =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      dispatch({
        type: notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const fetchAndUpdateMetamaskNotifications =
  (): ThunkDispatchReturn => async (dispatch: Dispatch) => {
    try {
      const metamaskNotifications =
        await NotificationServicesController.fetchAndUpdateMetamaskNotifications();
      if (!metamaskNotifications) {
        return getErrorMessage(
          notificationsErrors.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS,
        );
      }
      dispatch({
        type: notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS,
        payload: { notifications: metamaskNotifications },
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
export const markMetamaskNotificationsAsRead =
  (notifications: MarkAsReadNotificationsParam): ThunkDispatchReturn =>
  async (dispatch: Dispatch) => {
    try {
      await NotificationServicesController.markMetamaskNotificationsAsRead(
        notifications,
      );

      dispatch({
        type: notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ,
      });
    } catch (error) {
      return getErrorMessage(error);
    }
  };
