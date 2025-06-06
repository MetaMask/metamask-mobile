import { useCallback } from 'react';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Logger from '../../../util/Logger';
import { EXISTING_USER } from '../../../constants/storage';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { clearAllVaultBackups } from '../../../core/BackupVault';
import { useMetrics } from '../useMetrics';

const useDeleteWallet = () => {
  const metrics = useMetrics();
  const resetWalletState = useCallback(async () => {
    try {
      await Authentication.newWalletAndKeychain(`${Date.now()}`, {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      await clearAllVaultBackups();
      await Authentication.lockApp();
    } catch (error) {
      const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
      Logger.log(error, errorMsg);
    }
  }, []);

  const deleteUser = async () => {
    try {
      await FilesystemStorage.removeItem(EXISTING_USER);
      await metrics.createDataDeletionTask();
    } catch (error) {
      const errorMsg = `Failed to remove key: ${EXISTING_USER} from FilesystemStorage`;
      Logger.log(error, errorMsg);
    }
  };

  return [resetWalletState, deleteUser];
};

export default useDeleteWallet;
