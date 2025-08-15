import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';

export const performSignIn = async () => {
  try {
    await Engine.context.AuthenticationController.performSignIn();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const performSignOut = () => {
  try {
    Engine.context.AuthenticationController.performSignOut();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const setIsBackupAndSyncFeatureEnabled = async (
  feature: keyof typeof BACKUPANDSYNC_FEATURES,
  enabled: boolean,
) => {
  try {
    await Engine.context.UserStorageController.setIsBackupAndSyncFeatureEnabled(
      feature,
      enabled,
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

export const setIsAccountSyncingReadyToBeDispatched = async (
  isAccountSyncingReadyToBeDispatched: boolean,
) => {
  try {
    await Engine.context.UserStorageController.setIsAccountSyncingReadyToBeDispatched(
      isAccountSyncingReadyToBeDispatched,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const setHasAccountSyncingSyncedAtLeastOnce = async (
  hasAccountSyncingSyncedAtLeastOnce: boolean,
) => {
  try {
    await Engine.context.UserStorageController.setHasAccountSyncingSyncedAtLeastOnce(
      hasAccountSyncingSyncedAtLeastOnce,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

/**
 * "Locks" account syncing by setting the necessary flags in UserStorageController.
 * This is used to temporarily prevent account syncing from listening to accounts being changed, and the downward sync to happen.
 *
 * @returns
 */
export const lockAccountSyncing = async () => {
  try {
    await Engine.context.UserStorageController.setHasAccountSyncingSyncedAtLeastOnce(
      false,
    );
    await Engine.context.UserStorageController.setIsAccountSyncingReadyToBeDispatched(
      false,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

/**
 * "Unlocks" account syncing by setting the necessary flags in UserStorageController.
 * This is used to resume account syncing after it has been locked.
 * This will trigger a downward sync if this is called after a lockAccountSyncing call.
 *
 * @returns
 */
export const unlockAccountSyncing = async () => {
  try {
    await Engine.context.UserStorageController.setHasAccountSyncingSyncedAtLeastOnce(
      true,
    );
    await Engine.context.UserStorageController.setIsAccountSyncingReadyToBeDispatched(
      true,
    );
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const syncContactsWithUserStorage = async () => {
  try {
    await Engine.context.UserStorageController.syncContactsWithUserStorage();
  } catch (error) {
    return getErrorMessage(error);
  }
};
