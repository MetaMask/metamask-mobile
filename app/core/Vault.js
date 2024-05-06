import Engine from './Engine';
import Logger from '../util/Logger';
import { KeyringTypes } from '@metamask/keyring-controller';
import { getLedgerKeyring } from './Ledger/Ledger';

/**
 * Restores the QR keyring if it exists.
 */
export const restoreQRKeyring = async (qrKeyring) => {
  const { KeyringController } = Engine.context;

  if (qrKeyring) {
    try {
      const serializedQRKeyring = await qrKeyring.serialize();
      await KeyringController.restoreQRKeyring(serializedQRKeyring);
    } catch (e) {
      Logger.error(
        e,
        'error while trying to get qr accounts on recreate vault',
      );
    }
  }
};

/**
 * Restores the Ledger keyring if it exists.
 */
export const restoreLedgerKeyring = async (keyring) => {
  const { KeyringController } = Engine.context;

  if (keyring) {
    try {
      const serializedLedgerKeyring = await keyring.serialize();
      (await getLedgerKeyring()).deserialize(serializedLedgerKeyring);

      await KeyringController.persistAllKeyrings();
    } catch (e) {
      Logger.error(
        e,
        'error while trying to restore Ledger accounts on recreate vault',
      );
    }
  }
};

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = '') => {
  const { KeyringController } = Engine.context;
  return await KeyringController.exportSeedPhrase(password);
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
  const { KeyringController } = Engine.context;
  const seedPhrase = await getSeedPhrase(password);

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

  // Get props to restore vault
  const hdKeyring = KeyringController.state.keyrings[0];
  const existingAccountCount = hdKeyring.accounts.length;

  const ledgerKeyring = await getLedgerKeyring();
  const qrKeyring = (
    await KeyringController.getKeyringsByType(KeyringTypes.qr)
  )[0];

  // Recreate keyring with password given to this method
  await KeyringController.createNewVaultAndRestore(newPassword, seedPhrase);

  await restoreQRKeyring(qrKeyring);
  await restoreLedgerKeyring(ledgerKeyring);

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
  const recreatedKeyrings = KeyringController.state.keyrings;
  // Reselect previous selected account if still available
  for (const keyring of recreatedKeyrings) {
    if (keyring.accounts.includes(selectedAddress.toLowerCase())) {
      Engine.setSelectedAddress(selectedAddress);
      return;
    }
  }
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
