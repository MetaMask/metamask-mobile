import Engine from './Engine';
import Logger from '../util/Logger';
import { KeyringTypes, KeyringControllerState, AccountImportStrategy } from '@metamask/keyring-controller';
import { withLedgerKeyring } from './Ledger/Ledger';

interface LedgerBridgeKeyringOptions {
  accounts?: string[];
}

/**
 * Restore the given serialized QR keyring.
 *
 * @param {unknown} serializedQrKeyring - A serialized QR keyring.
 */
export const restoreQRKeyring = async (serializedQrKeyring: unknown) => {
  const { KeyringController } = Engine.context;

  try {
    await KeyringController.restoreQRKeyring(serializedQrKeyring);
  } catch (e) {
    Logger.error(e as Error, 'error while trying to get qr accounts on recreate vault');
  }
};

/**
 * Restore the given serialized Ledger keyring.
 *
 * @param {unknown} serializedLedgerKeyring - A serialized Ledger keyring.
 */
export const restoreLedgerKeyring = async (serializedLedgerKeyring: unknown) => {
  try {
    await withLedgerKeyring(async (keyring) => {
      await keyring.deserialize(serializedLedgerKeyring as Partial<LedgerBridgeKeyringOptions> | undefined);
    });
  } catch (e) {
    Logger.error(
      e as Error,
      'error while trying to restore Ledger accounts on recreate vault',
    );
  }
};

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = ''): Promise<Uint8Array> => {
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
  password: string,
  newPassword: string,
  selectedAddress: string,
) => {
  const { KeyringController } = Engine.context;
  const seedPhrase = await getSeedPhrase(password);

  let importedAccounts: string[] = [];
  try {
    // Get imported accounts
    const simpleKeyrings = KeyringController.state.keyrings.filter(
      (keyring) => keyring.type === KeyringTypes.simple,
    );
    for (const simpleKeyring of simpleKeyrings) {
      const simpleKeyringAccounts = await Promise.all(
        simpleKeyring.accounts.map((account) =>
          KeyringController.exportAccount(password, account),
        ),
      );
      importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
    }
  } catch (e) {
    Logger.error(
      e as Error,
      'error while trying to get imported accounts on recreate vault',
    );
  }

  // Get props to restore vault
  const hdKeyring = KeyringController.state.keyrings[0];
  const existingAccountCount = hdKeyring.accounts.length;

  const serializedLedgerKeyring = hasKeyringType(
    KeyringController.state,
    KeyringTypes.ledger,
  )
    ? await getSerializedKeyring(KeyringTypes.ledger)
    : undefined;
  const serializedQrKeyring = hasKeyringType(
    KeyringController.state,
    KeyringTypes.qr,
  )
    ? await getSerializedKeyring(KeyringTypes.qr)
    : undefined;

  // Recreate keyring with password given to this method
  await KeyringController.createNewVaultAndRestore(newPassword, seedPhrase as Uint8Array);

  if (serializedQrKeyring !== undefined) {
    await restoreQRKeyring(serializedQrKeyring);
  }
  if (serializedLedgerKeyring !== undefined) {
    await restoreLedgerKeyring(serializedLedgerKeyring);
  }

  // Create previous accounts again
  for (let i = 0; i < existingAccountCount - 1; i++) {
    await KeyringController.addNewAccount();
  }

  try {
    // Import imported accounts again
    for (const importedAccount of importedAccounts) {
      await KeyringController.importAccountWithStrategy('privateKey' as AccountImportStrategy, [
        importedAccount,
      ]);
    }
  } catch (e) {
    Logger.error(e as Error, 'error while trying to import accounts on recreate vault');
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
  selectedAddress: string,
  password = '',
) => recreateVaultWithNewPassword(password, password, selectedAddress);

/**
 * Checks whether the given keyring type exists in the given state.
 *
 * @param {KeyringControllerState} state - The KeyringController state.
 * @param {KeyringTypes} type - The keyring type to check for.
 * @returns Whether the type was found in state.
 */
function hasKeyringType(state: KeyringControllerState, type: KeyringTypes) {
  return state?.keyrings?.some((keyring) => keyring.type === type);
}

/**
 * Get the serialized state from the first keyring found of the given type.
 *
 * @param {KeyringTypes} type - The type of keyring to serialize.
 * @returns The serialized state for the first keyring found of the given type.
 */
async function getSerializedKeyring(type: KeyringTypes) {
  const { KeyringController } = Engine.context;
  return await KeyringController.withKeyring({ type }, (keyring) =>
    keyring.serialize(),
  );
}
