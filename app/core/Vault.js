import Engine from './Engine';
import ReduxService from './redux';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from './Engine/controllers/seedless-onboarding-controller/error';

import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';
import { captureException } from '@sentry/react-native';
import { Authentication } from './Authentication/Authentication';
import { endTrace, trace, TraceName, TraceOperation } from '../util/trace';
import Logger from '../util/Logger';

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = '', keyringId) => {
  const { KeyringController } = Engine.context;
  return await KeyringController.exportSeedPhrase(password, keyringId);
};

/**
 * Recreates a vault with the new password
 *
 * @param password - current password
 * @param newPassword - new password
 * @param selectedAddress
 */
export const recreateVaultWithNewPassword = async (
  password,
  newPassword,
  selectedAddress,
  skipSeedlessOnboardingPWChange = false,
) => {
  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  const { setSelectedAddress } = Engine;

  if (!selectedAddress) {
    throw new Error('No selected address');
  }

  await KeyringController.verifyPassword(password);

  let seedlessChangePasswordError = null;
  await KeyringController.changePassword(newPassword);

  if (
    !skipSeedlessOnboardingPWChange &&
    selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())
  ) {
    let specificTraceSucceeded = false;
    try {
      trace({
        name: TraceName.OnboardingResetPassword,
        op: TraceOperation.OnboardingSecurityOp,
      });
      await SeedlessOnboardingController.changePassword(newPassword, password);
      await Authentication.syncKeyringEncryptionKey();
      specificTraceSucceeded = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      trace({
        name: TraceName.OnboardingResetPasswordError,
        op: TraceOperation.OnboardingError,
        tags: { errorMessage },
      });
      endTrace({
        name: TraceName.OnboardingResetPasswordError,
      });

      Logger.error(
        error,
        '[recreateVaultWithNewPassword] seedless onboarding pw change error',
      );
      seedlessChangePasswordError = new SeedlessOnboardingControllerError(
        SeedlessOnboardingControllerErrorType.ChangePasswordError,
        error || 'Password change failed',
      );

      captureException(seedlessChangePasswordError);
      // restore the vault with the old password
      await KeyringController.changePassword(password);
      await Authentication.syncKeyringEncryptionKey();
    } finally {
      endTrace({
        name: TraceName.OnboardingResetPassword,
        data: { success: specificTraceSucceeded },
      });
    }
  }

  setSelectedAddress(selectedAddress);
};

/**
 * Recreates a vault with the same password for the purpose of using the newest encryption methods
 *
 * @param password - Password to recreate and set the vault with
 */
export const recreateVaultWithSamePassword = async (
  password = '',
  selectedAddress,
) => recreateVaultWithNewPassword(password, password, selectedAddress);
