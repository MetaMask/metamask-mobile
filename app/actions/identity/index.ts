import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import Logger from '../../util/Logger';
import type { InternalAccount } from '@metamask/keyring-internal-api';

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
    Logger.log('🔄 STARTING syncInternalAccountsWithUserStorage');

    // DEBUG: Check account names and addresses BEFORE sync
    const accountsBefore =
      Engine.context.AccountsController.state.internalAccounts.accounts;
    Logger.log('📋 ACCOUNTS BEFORE SYNC:');
    Object.values(accountsBefore).forEach((account: InternalAccount, index) => {
      Logger.log(
        `  Account ${index}: name="${account.metadata.name}", address="${account.address}"`,
      );
    });

    await Engine.context.UserStorageController.syncInternalAccountsWithUserStorage();

    // DEBUG: Check account names and addresses AFTER sync
    const accountsAfter =
      Engine.context.AccountsController.state.internalAccounts.accounts;
    Logger.log('📋 ACCOUNTS AFTER SYNC:');
    Object.values(accountsAfter).forEach((account: InternalAccount, index) => {
      Logger.log(
        `  Account ${index}: name="${account.metadata.name}", address="${account.address}"`,
      );
    });

    Logger.log('✅ COMPLETED syncInternalAccountsWithUserStorage');
  } catch (error) {
    Logger.log(
      '❌ ERROR in syncInternalAccountsWithUserStorage:',
      getErrorMessage(error),
    );
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
