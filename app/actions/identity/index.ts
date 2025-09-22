import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';
import { BACKUPANDSYNC_FEATURES } from '@metamask/profile-sync-controller/user-storage';
import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import { EntropySourceId } from '@metamask/keyring-api';

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

export const syncContactsWithUserStorage = async () => {
  try {
    await Engine.context.UserStorageController.syncContactsWithUserStorage();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const syncAccountTreeWithUserStorage = async (
  options: {
    ensureDoneAtLeastOnce?: boolean;
    alsoDiscoverAndCreateAccounts?: boolean;
    entropySourceIdToDiscover?: EntropySourceId;
  } = {},
): Promise<{
  discoveredAccountsCount: number;
  error: string;
}> => {
  const result = {
    discoveredAccountsCount: 0,
    error: '',
  };
  try {
    if (!isMultichainAccountsState2Enabled()) {
      return result;
    }

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    await Engine.getSnapKeyring();
    ///: END:ONLY_INCLUDE_IF

    if (options.ensureDoneAtLeastOnce) {
      await Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce();
    } else {
      await Engine.context.AccountTreeController.syncWithUserStorage();
    }

    if (options.alsoDiscoverAndCreateAccounts) {
      const discoveredAccountsCount = await discoverAccounts(
        options.entropySourceIdToDiscover ??
          Engine.context.KeyringController.state.keyrings[0].metadata.id,
      );
      result.discoveredAccountsCount = discoveredAccountsCount;
    }
    return result;
  } catch (error) {
    result.error = getErrorMessage(error);
    return result;
  }
};
