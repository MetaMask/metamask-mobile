import Engine from './Engine';
import Logger from '../util/Logger';
import { syncPrefs, syncAccounts } from '../util/sync';
import { KeyringTypes } from '@metamask/keyring-controller';

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = '') => {
  const { KeyringController } = Engine.context;
  const mnemonic = await KeyringController.exportSeedPhrase(
    password,
  ).toString();
  return JSON.stringify(mnemonic).replace(/"/g, '');
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
  const { KeyringController, PreferencesController, AccountTrackerController } =
    Engine.context;
  const seedPhrase = await getSeedPhrase(password);
  const oldPrefs = PreferencesController.state;
  const oldAccounts = AccountTrackerController.accounts;

  let importedAccounts = [];
  try {
    // Get imported accounts
    const simpleKeyrings = KeyringController.state.keyrings.filter(
      (keyring) => keyring.type === KeyringTypes.simple,
    );
    for (let i = 0; i < simpleKeyrings.length; i++) {
      const simpleKeyring = simpleKeyrings[i];
      const simpleKeyringAccounts = await Promise.all(
        simpleKeyring.accounts.map((account) =>
          KeyringController.exportAccount(password, account),
        ),
      );
      importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
    }
  } catch (e) {
    Logger.error(
      e,
      'error while trying to get imported accounts on recreate vault',
    );
  }

  const qrKeyring = await KeyringController.getOrAddQRKeyring();
  const serializedQRKeyring = await qrKeyring.serialize();

  // Recreate keyring with password given to this method
  await KeyringController.createNewVaultAndRestore(newPassword, seedPhrase);

  // Get props to restore vault
  const hdKeyring = KeyringController.state.keyrings[0];
  const existingAccountCount = hdKeyring.accounts.length;

  await KeyringController.restoreQRKeyring(serializedQRKeyring);

  // Create previous accounts again
  for (let i = 0; i < existingAccountCount - 1; i++) {
    await KeyringController.addNewAccount();
  }

  try {
    // Import imported accounts again
    for (let i = 0; i < importedAccounts.length; i++) {
      await KeyringController.importAccountWithStrategy('privateKey', [
        importedAccounts[i],
      ]);
    }
  } catch (e) {
    Logger.error(e, 'error while trying to import accounts on recreate vault');
  }

  //Persist old account/identities names
  const preferencesControllerState = PreferencesController.state;
  const prefUpdates = syncPrefs(oldPrefs, preferencesControllerState);

  //Persist old account data
  const accounts = AccountTrackerController.accounts;
  const updateAccounts = syncAccounts(oldAccounts, accounts);

  // Set preferencesControllerState again
  await PreferencesController.update(prefUpdates);
  await AccountTrackerController.update(updateAccounts);

  const recreatedKeyrings = KeyringController.state.keyrings;
  // Reselect previous selected account if still available
  for (const keyring of recreatedKeyrings) {
    if (keyring.accounts.includes(selectedAddress)) {
      PreferencesController.setSelectedAddress(selectedAddress);
      return;
    }
  }

  // Default to first account as fallback
  PreferencesController.setSelectedAddress(hdKeyring.accounts[0]);
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
