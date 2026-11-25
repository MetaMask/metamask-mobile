import Engine from './Engine';
import Logger from '../util/Logger';
import ReduxService from './redux';

import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';
import { Authentication } from './Authentication/Authentication';
import { signOutCardAfterPasswordChange } from './signOutCardAfterPasswordChange';
import { endTrace, trace, TraceName, TraceOperation } from '../util/trace';

/**
 * Return the seed phrase from vault for the provided `keyringId`.
 * If the wallet is unlocked, the password can be an empty string. Otherwise, a password
 * is required to retrieve the seed phrase from the vault.
 *
 * @param {string} password - Password to retrieve the seed phrase from the vault
 * @param {string} keyringId - Keyring ID to retrieve the seed phrase from the vault
 * @returns {Promise<string>} - Seed phrase from the vault
 */
export const getSeedPhrase = async (password: string, keyringId: string) => {
  const { KeyringController } = Engine.context;
  return await KeyringController.exportSeedPhrase({ password }, keyringId);
};

/**
 * Changes the password of the seedless onboarding controller and re-creates seedless vault using new password.
 *
 * @param {string} newPassword - new password
 * @param {string} password - current password
 */
export const recreateSeedlessVaultWithNewPassword = async (
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
      '[recreateSeedlessVaultWithNewPassword] seedless onboarding pw change error',
    );

    throw error;
  } finally {
    endTrace({
      name: TraceName.OnboardingResetPassword,
      data: { success: specificTraceSucceeded },
    });
  }
};

/**
 * Recreates keyring and seedless storage vault with the new password.
 *
 * @param password - current password
 * @param newPassword - new password
 * @param selectedAddress - current selected address in wallet.
 */
export const recreateVaultsWithNewPassword = async (
  password: string,
  newPassword: string,
  selectedAddress: string,
) => {
  const { KeyringController } = Engine.context;
  const isSeedlessFlow = selectSeedlessOnboardingLoginFlow(
    ReduxService.store.getState(),
  );

  // Change the Seedless password first, then update the local Keyring and
  // complete the key-sync lifecycle. Failures preserve the lifecycle for
  // recovery and lock the wallet so unlock can reconcile state cleanly.
  if (isSeedlessFlow) {
    try {
      await recreateSeedlessVaultWithNewPassword(newPassword, password);
      await KeyringController.changePassword(newPassword);
      await Authentication.syncAndCompleteKeyringEncryptionKey();
    } catch (error) {
      await Authentication.lockApp({ locked: true, reset: false });
      throw error;
    }
  } else {
    await KeyringController.changePassword(newPassword);
  }

  Engine.setSelectedAddress(selectedAddress);
  // Card logout is a remote call with no timeout. It must not delay the
  // password change or sit before the seedless key sync.
  signOutCardAfterPasswordChange().catch(() => undefined);
};
