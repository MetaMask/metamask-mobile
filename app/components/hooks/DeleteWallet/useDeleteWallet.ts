import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import { setExistingUser } from '../../../actions/user';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { clearAllVaultBackups } from '../../../core/BackupVault';
import { useMetrics } from '../useMetrics';
import Engine from '../../../core/Engine';

const useDeleteWallet = () => {
  const metrics = useMetrics();
  const dispatch = useDispatch();

  const resetWalletState = useCallback(async () => {
    try {
      await Authentication.newWalletAndKeychain(`${Date.now()}`, {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });

      Engine.context.SeedlessOnboardingController.clearState();

      await clearAllVaultBackups();
      await Authentication.lockApp();
    } catch (error) {
      const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
      Logger.log(error, errorMsg);
    }
  }, []);

  const deleteUser = async () => {
    try {
      dispatch(setExistingUser(false));
      await metrics.createDataDeletionTask();
    } catch (error) {
      const errorMsg = `Failed to reset existingUser state in Redux`;
      Logger.log(error, errorMsg);
    }
  };

  return [resetWalletState, deleteUser];
};

export default useDeleteWallet;
