import Engine from './Engine';
import Logger from '../util/Logger';
import { KeyringTypes } from '@metamask/keyring-controller';
import { withLedgerKeyring } from './Ledger/Ledger';
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from './SnapKeyring/MultichainWalletSnapClient';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';

/**
 * Restore the given serialized QR keyring.
 *
 * @param {unknown} serializedQrKeyring - A serialized QR keyring.
 */
export const restoreQRKeyring = async (serializedQrKeyring) => {
  const { KeyringController } = Engine.context;

  try {
    await KeyringController.restoreQRKeyring(serializedQrKeyring);
  } catch (e) {
    Logger.error(e, 'error while trying to get qr accounts on recreate vault');
  }
};

/**
 * Restore the given serialized Ledger keyring.
 *
 * @param {unknown} serializedLedgerKeyring - A serialized Ledger keyring.
 */
export const restoreLedgerKeyring = async (serializedLedgerKeyring) => {
  try {
    await withLedgerKeyring(async (keyring) => {
      await keyring.deserialize(serializedLedgerKeyring);
    });
  } catch (e) {
    Logger.error(
      e,
      'error while trying to restore Ledger accounts on recreate vault',
    );
  }
};

export const restoreImportedSrp = async (seedPhrase, numberOfAccounts) => {
  const { KeyringController } = Engine.context;
  try {
    const { id: keyringId } = await KeyringController.addNewKeyring(
      KeyringTypes.hd,
      {
        mnemonic: seedPhrase,
      },
    );

    for (let i = 0; i < numberOfAccounts; i++) {
      await KeyringController.withKeyring(
        { id: keyringId },
        async ({ keyring }) => await keyring.addAccounts(1),
      );
    }

    return keyringId;
  } catch (e) {
    Logger.error(
      e,
      'error while trying to restore imported srp accounts on recreate vault',
    );
  }
};

export const restoreSnapAccounts = async (accountType, entropySource) => {
  let walletClientType;
  let scope;
  switch (accountType) {
    case SolAccountType.DataAccount: {
      walletClientType = WalletClientType.Solana;
      scope = SolScope.Mainnet;
      break;
    }
    case BtcAccountType.P2wpkh: {
      walletClientType = WalletClientType.Bitcoin;
      scope = BtcScope.Mainnet;
      break;
    }
    default:
      throw new Error('Unsupported account type');
  }

  try {
    const client = MultichainWalletSnapFactory.createClient(walletClientType);
    await client.createAccount({
      entropySource,
      scope,
    });
  } catch (e) {
    Logger.error(
      e,
      'error while trying to restore snap accounts on recreate vault',
    );
  }
};

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
  const { KeyringController, AccountsController } = Engine.context;
  const hdKeyringsWithMetadata = KeyringController.state.keyrings
    .map((keyring, _index) => ({
      ...keyring,
      ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
      metadata: KeyringController.state.keyringsMetadata?.[_index] || {},
      ///: END:ONLY_INCLUDE_IF
    }))
    .filter((keyring) => keyring.type === KeyringTypes.hd);

  const seedPhrases = await Promise.all(
    hdKeyringsWithMetadata.map(async (keyring) => {
      try {
        return await getSeedPhrase(password, keyring.metadata.id);
      } catch (e) {
        Logger.error(
          e,
          'error while trying to get seed phrase on recreate vault',
        );
        return null;
      }
    }),
  );
  const [primaryKeyringSeedPhrase, ...otherSeedPhrases] = seedPhrases;
  if (!primaryKeyringSeedPhrase) {
    throw new Error('error while trying to get seed phrase on recreate vault');
  }

  // START: Getting accounts to be reimported

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

  const firstPartySnapAccounts =
    AccountsController.listMultichainAccounts().filter(
      (account) => account.options?.entropySource,
    );

  // Get props to restore vault
  const hdKeyringsAccountCount = hdKeyringsWithMetadata.map(
    (keyring) => keyring.accounts.length,
  );
  const [primaryKeyringAccountCount, ...otherKeyringAccountCounts] =
    hdKeyringsAccountCount;

  // END: Getting accounts to be reimported

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
  await KeyringController.createNewVaultAndRestore(
    newPassword,
    primaryKeyringSeedPhrase,
  );
  const [newPrimaryKeyringMetadata] = KeyringController.state.keyringsMetadata;
  const newPrimaryKeyringId = newPrimaryKeyringMetadata.id;

  // START: Restoring keyrings

  if (serializedQrKeyring !== undefined) {
    await restoreQRKeyring(serializedQrKeyring);
  }
  if (serializedLedgerKeyring !== undefined) {
    await restoreLedgerKeyring(serializedLedgerKeyring);
  }

  // Create previous accounts again
  for (let i = 0; i < primaryKeyringAccountCount - 1; i++) {
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

  // recreate import srp accounts
  const importedSrpKeyringIds = [];
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  for (const [index, otherSeedPhrase] of otherSeedPhrases.entries()) {
    const importedSrpKeyring = await restoreImportedSrp(
      otherSeedPhrase,
      otherKeyringAccountCounts[index],
    );
    importedSrpKeyringIds.push(importedSrpKeyring);
  }
  ///: END:ONLY_INCLUDE_IF(multi-srp)

  const newHdKeyringIds = [newPrimaryKeyringId, ...importedSrpKeyringIds];
  // map old keyring id to new keyring id
  const keyringIdMap = new Map();
  for (const [index, keyring] of hdKeyringsWithMetadata.entries()) {
    keyringIdMap.set(keyring.metadata.id, newHdKeyringIds[index]);
  }

  // recreate snap accounts
  for (const snapAccount of firstPartySnapAccounts) {
    await restoreSnapAccounts(
      snapAccount.type,
      keyringIdMap.get(snapAccount.options.entropySource),
    );
  }

  // END: Restoring keyrings

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

/**
 * Checks whether the given keyring type exists in the given state.
 *
 * @param {KeyringControllerState} state - The KeyringController state.
 * @param {KeyringTypes} type - The keyring type to check for.
 * @returns Whether the type was found in state.
 */
function hasKeyringType(state, type) {
  return state?.keyrings?.some((keyring) => keyring.type === type);
}

/**
 * Get the serialized state from the first keyring found of the given type.
 *
 * @param {KeyringTypes} type - The type of keyring to serialize.
 * @returns The serialized state for the first keyring found of the given type.
 */
async function getSerializedKeyring(type) {
  const { KeyringController } = Engine.context;
  return await KeyringController.withKeyring({ type }, ({ keyring }) =>
    keyring.serialize(),
  );
}
