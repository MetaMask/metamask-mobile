import Engine from './Engine';
import Logger from '../util/Logger';
import {
  KeyringTypes,
  AccountImportStrategy,
  KeyringControllerState,
} from '@metamask/keyring-controller';
import { withLedgerKeyring } from './Ledger/Ledger';
import { LedgerBridgeKeyringOptions } from '@metamask/eth-ledger-bridge-keyring';

// Extend LedgerBridgeKeyringOptions type for our use
type ExtendedLedgerBridgeKeyringOptions = LedgerBridgeKeyringOptions & {
  accountIndexes: Readonly<Record<string, number>>;
  hdPath?: string;
};

/**
 * Restore the given serialized QR keyring.
 *
 * @param serializedQrKeyring - A serialized QR keyring.
 */
export const restoreQRKeyring = async (
  serializedQrKeyring: unknown,
): Promise<void> => {
  const { KeyringController } = Engine.context;

  try {
    await KeyringController.restoreQRKeyring(serializedQrKeyring);
  } catch (e) {
    Logger.error(
      e as Error,
      'error while trying to get qr accounts on recreate vault',
    );
  }
};

/**
 * Restore the given serialized Ledger keyring.
 *
 * @param serializedLedgerKeyring - A serialized Ledger keyring.
 */
export const restoreLedgerKeyring = async (
  serializedLedgerKeyring: Partial<ExtendedLedgerBridgeKeyringOptions> | null | undefined,
): Promise<void> => {
  try {
    await withLedgerKeyring(async (keyring) => {
      if (serializedLedgerKeyring) {
        await keyring.deserialize(serializedLedgerKeyring);
      }
    });
  } catch (e) {
    Logger.error(
      e instanceof Error ? e : new Error(String(e)),
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
      e instanceof Error ? e : new Error(String(e)),
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
  await KeyringController.createNewVaultAndRestore(newPassword, seedPhrase);

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
    for (const account of importedAccounts) {
      await KeyringController.importAccountWithStrategy(
        'privateKey' as AccountImportStrategy,
        [account],
      );
    }
  } catch (e) {
    Logger.error(
      e instanceof Error ? e : new Error(String(e)),
      'error while trying to import accounts on recreate vault',
    );
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
 * @param selectedAddress - The selected address
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
function hasKeyringType(state: KeyringControllerState, type: KeyringTypes): boolean {
  return state?.keyrings?.some((keyring) => keyring.type === type);
}

/**
 * Get the serialized state from the first keyring found of the given type.
 *
 * @param {KeyringTypes} type - The type of keyring to serialize.
 * @returns The serialized state for the first keyring found of the given type.
 */
async function getSerializedKeyring(type: KeyringTypes): Promise<unknown> {
  const { KeyringController } = Engine.context;
  return await KeyringController.withKeyring({ type }, (keyring: any) =>
    keyring.serialize(),
  );
}
