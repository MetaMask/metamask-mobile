import Engine from './Engine';
import Logger from '../util/Logger';
import { KeyringTypes } from '@metamask/keyring-controller';
import ReduxService from './redux';
import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';

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
) => {
  const { KeyringController, SeedlessOnboardingController } = Engine.context;
  const { setSelectedAddress } = Engine;
  const [primaryKeyring] = KeyringController.state.keyrings.filter(
    (keyring) => keyring.type === KeyringTypes.hd,
  );

  const primaryKeyringSeedPhrase = await getSeedPhrase(
    password,
    primaryKeyring.metadata.id,
  );

  if (!primaryKeyringSeedPhrase) {
    throw new Error('error while trying to get seed phrase on recreate vault');
  }

  await KeyringController.changePassword(password, newPassword);

  let seedlessChangePasswordError = null;
  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    await SeedlessOnboardingController.changePassword(newPassword, password);
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
