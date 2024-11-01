import { getErrorMessage } from '@metamask/utils';

import { notificationsErrors } from '../constants';
import Engine from '../../../core/Engine';
import { Notification } from '../../../util/notifications';

export type MarkAsReadNotificationsParam = Pick<
  Notification,
  'id' | 'type' | 'isRead'
>[];

export const signIn = async () => {
  try {
    const accessToken =
      await Engine.context.AuthenticationController.performSignIn();
    if (!accessToken) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }

    const profile =
      await Engine.context.AuthenticationController.getSessionProfile();
    if (!profile) {
      return getErrorMessage(notificationsErrors.PERFORM_SIGN_IN);
    }
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const signOut = async () => {
  try {
    await Engine.context.AuthenticationController.performSignOut();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const enableProfileSyncing = async () => {
  try {
    await Engine.context.UserStorageController.enableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const disableProfileSyncing = async () => {
  try {
    await Engine.context.UserStorageController.disableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const enableNotificationServices = async () => {
  try {
    await Engine.context.NotificationServicesController.enableMetamaskNotifications();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const disableNotificationServices = async () => {
  try {
    await Engine.context.NotificationServicesController.disableNotificationServices();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const checkAccountsPresence = async (accounts: string[]) => {
  try {
    const { presence } =
      await Engine.context.NotificationServicesController.checkAccountsPresence(
        accounts,
      );
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
      await Engine.context.NotificationServicesController.deleteOnChainTriggersByAccount(
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
      await Engine.context.NotificationServicesController.updateOnChainTriggersByAccount(
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

export const createOnChainTriggersByAccount = async (
  resetNotifications: boolean,
) => {
  try {
    const { userStorage } =
      await Engine.context.NotificationServicesController.createOnChainTriggers(
        {
          resetNotifications,
        },
      );

    if (!userStorage) {
      return getErrorMessage(
        notificationsErrors.CREATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
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
    await Engine.context.NotificationServicesController.setFeatureAnnouncementsEnabled(
      featureAnnouncementsEnabled,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const fetchAndUpdateMetamaskNotifications = async () => {
  try {
    const metamaskNotifications =
      await Engine.context.NotificationServicesController.fetchAndUpdateMetamaskNotifications();
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
    await Engine.context.NotificationServicesController.markMetamaskNotificationsAsRead(
      notifications,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const syncInternalAccountsWithUserStorage = async () => {
  try {
    await Engine.context.UserStorageController.syncInternalAccountsWithUserStorage();
  } catch (error) {
    return getErrorMessage(error);
  }
};

/**
 * Perform the deletion of the notifications storage key and the creation of on chain triggers to reset the notifications.
 *
 * @returns {Promise<string | undefined>} A promise that resolves to a string error message or undefined if successful.
 */
export const performDeleteStorage = async (): Promise<string | undefined> => {
  try {
    await Engine.context.UserStorageController.performDeleteStorage(
      'notifications.notification_settings',
    );
    await Engine.context.NotificationServicesController.createOnChainTriggers({
      resetNotifications: true,
    });
  } catch (error) {
    return getErrorMessage(error);
  }
};
