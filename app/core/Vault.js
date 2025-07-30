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
export const getSeedPhrase = async (password = '', keyringId) => {
  const { KeyringController } = Engine.context;
  return await KeyringController.exportSeedPhrase(password, keyringId);
};

/**
 * Changes the password of the seedless onboarding controller
 *
 * @param {string} newPassword - new password
 * @param {string} password - current password
 */
export const seedlessChangePassword = async (newPassword, password) => {
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
      error,
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
  password,
  newPassword,
  selectedAddress,
) => {
  const { KeyringController } = Engine.context;

  await KeyringController.changePassword(newPassword);

  const isSeedlessFlow = selectSeedlessOnboardingLoginFlow(
    ReduxService.store.getState(),
  );
  if (isSeedlessFlow) {
    try {
      await seedlessChangePassword(newPassword, password);
    } catch (error) {
      await KeyringController.changePassword(password);
      throw error;
    } finally {
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
  password = '',
  selectedAddress,
) => recreateVaultWithNewPassword(password, password, selectedAddress);
