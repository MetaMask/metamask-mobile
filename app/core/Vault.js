import Engine from './Engine';
import ReduxService from './redux';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from './Engine/controllers/seedless-onboarding-controller/error';

import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';
import { captureException } from '@sentry/react-native';

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

  try {
    await KeyringController.verifyPassword(password);
  } catch (error) {
    throw new Error('Invalid password');
  }

  let seedlessChangePasswordError = null;
  await KeyringController.changePassword(newPassword);

  if (
    !skipSeedlessOnboardingPWChange &&
    selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())
  ) {
    try {
      await SeedlessOnboardingController.changePassword(newPassword, password);
    } catch (error) {
      seedlessChangePasswordError = new SeedlessOnboardingControllerError(
        error || 'Password change failed',
        SeedlessOnboardingControllerErrorType.ChangePasswordError,
      );

      captureException(seedlessChangePasswordError);
      // restore the vault with the old password
      await KeyringController.changePassword(password);
      throw seedlessChangePasswordError;
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
