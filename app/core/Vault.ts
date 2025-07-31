import Engine from './Engine';
import Logger from '../util/Logger';
import ReduxService from './redux';

import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';
import { Authentication } from './Authentication/Authentication';
import { endTrace, trace, TraceName, TraceOperation } from '../util/trace';

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password: string, keyringId: string) => {
  const { KeyringController } = Engine.context;
  return await KeyringController.exportSeedPhrase(password, keyringId);
};

/**
 * Changes the password of the seedless onboarding controller
 *
 * @param {string} newPassword - new password
 * @param {string} password - current password
 */
export const seedlessChangePassword = async (
  newPassword: string,
  password: string,
) => {
  const { SeedlessOnboardingController } = Engine.context;
  let specificTraceSucceeded = false;
  try {
    trace({
      name: TraceName.OnboardingResetPassword,
      op: TraceOperation.OnboardingSecurityOp,
    });
    await SeedlessOnboardingController.changePassword(newPassword, password);
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
      error as Error,
      '[recreateVaultWithNewPassword] seedless onboarding pw change error',
    );
    // restore keyring with old password if seedless onboarding pw change fails

    throw error;
  } finally {
    endTrace({
      name: TraceName.OnboardingResetPassword,
      data: { success: specificTraceSucceeded },
    });
  }
};

/**
 * Recreates a vault with the new password
 *
 * @param password - current password
 * @param newPassword - new password
 * @param selectedAddress - selected address
 */
export const recreateVaultWithNewPassword = async (
  password: string,
  newPassword: string,
  selectedAddress: string,
) => {
  const { KeyringController } = Engine.context;
  const isSeedlessFlow = selectSeedlessOnboardingLoginFlow(
    ReduxService.store.getState(),
  );

  try {
    // we change the password in the seedless flow first
    // if it succed seedless change password but fail on the change password on local, we will prompt user password out of date
    // and ask user to login with new password
    if (isSeedlessFlow) {
      await seedlessChangePassword(newPassword, password);
    }

    await KeyringController.changePassword(newPassword);
  } finally {
    if (isSeedlessFlow) {
      await Authentication.syncKeyringEncryptionKey();
    }
  }
  Engine.setSelectedAddress(selectedAddress);
};

/**
 * Recreates a vault with the same password for the purpose of using the newest encryption methods
 *
 * @param password - Password to recreate and set the vault with
 */
export const recreateVaultWithSamePassword = async (
  password: string,
  selectedAddress: string,
) => recreateVaultWithNewPassword(password, password, selectedAddress);
