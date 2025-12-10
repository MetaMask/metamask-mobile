import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import { setExistingUser } from '../../../actions/user';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { clearAllVaultBackups } from '../../../core/BackupVault';
import { useMetrics } from '../useMetrics';
import Engine from '../../../core/Engine';
import { Engine as EngineClass } from '../../../core/Engine/Engine';
import { resetProviderToken as depositResetProviderToken } from '../../UI/Ramp/Deposit/utils/ProviderTokenVault';

const useDeleteWallet = () => {
  const metrics = useMetrics();
  const dispatch = useDispatch();

  const resetWalletState = useCallback(async () => {
    try {
      // Clear vault backups BEFORE creating temporary wallet
      await clearAllVaultBackups();

      // CRITICAL: Disable automatic vault backups during wallet RESET
      // This prevents the temporary wallet (created during reset) from being backed up
      EngineClass.disableAutomaticVaultBackup = true;

      try {
        await Authentication.newWalletAndKeychain(`${Date.now()}`, {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        });

        Engine.context.SeedlessOnboardingController.clearState();

        await depositResetProviderToken();

        await Engine.controllerMessenger.call('RewardsController:resetAll');

        // Lock the app and navigate to onboarding
        await Authentication.lockApp({ navigateToLogin: false });
      } finally {
        // ALWAYS re-enable automatic vault backups, even if error occurs
        EngineClass.disableAutomaticVaultBackup = false;
      }
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
