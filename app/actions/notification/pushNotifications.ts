import { getErrorMessage } from '@metamask/utils';

import { notificationsErrors } from './helpers/constants';
import Engine from '../../core/Engine';
import { Notification } from '../../util/notifications';

const {
  AuthenticationController,
  UserStorageController,
  NotificationServicesController,
} = Engine.context;

type MarkAsReadNotificationsParam = Pick<
  Notification,
  'id' | 'type' | 'isRead'
>[];

export const signIn = async () => {
  try {
    const accessToken = await AuthenticationController.performSignIn();
    if (!accessToken) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }

    const profile = await AuthenticationController.getSessionProfile();
    if (!profile) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const signOut = async () => {
  try {
    await AuthenticationController.performSignOut();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const enableProfileSyncing = async () => {
  try {
    await UserStorageController.enableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const disableProfileSyncing = async () => {
  try {
    await NotificationServicesController.disableNotificationServices();
    await UserStorageController.disableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const enableNotificationServices = async () => {
  try {
    await NotificationServicesController.enableMetamaskNotifications();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const disableNotificationServices = async () => {
  try {
    await NotificationServicesController.disableNotificationServices();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const checkAccountsPresence = async (accounts: string[]) => {
  try {
    const { presence } =
      await NotificationServicesController.checkAccountsPresence(accounts);
    if (!presence) {
      return getErrorMessage(notificationsErrors.CHECK_ACCOUNTS_PRESENCE);
    }
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const deleteOnChainTriggersByAccount = async (accounts: string[]) => {
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
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const updateOnChainTriggersByAccount = async (accounts: string[]) => {
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
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const setFeatureAnnouncementsEnabled = async (
  featureAnnouncementsEnabled: boolean,
) => {
  try {
    await NotificationServicesController.setFeatureAnnouncementsEnabled(
      featureAnnouncementsEnabled,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const fetchAndUpdateMetamaskNotifications = async () => {
  try {
    const metamaskNotifications =
      await NotificationServicesController.fetchAndUpdateMetamaskNotifications();
    if (!metamaskNotifications) {
      return getErrorMessage(
        notificationsErrors.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS,
      );
    }
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const markMetamaskNotificationsAsRead = async (
  notifications: MarkAsReadNotificationsParam,
) => {
  try {
    await NotificationServicesController.markMetamaskNotificationsAsRead(
      notifications,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};
