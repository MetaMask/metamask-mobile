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
import ReduxService from './redux';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from './Engine/controllers/seedless-onboarding-controller/error';

import { selectSeedlessOnboardingLoginFlow } from '../selectors/seedlessOnboardingController';
import { Authentication } from './Authentication/Authentication';
import { endTrace, trace, TraceName, TraceOperation } from '../util/trace';

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
    case BtcAccountType.P2pkh:
    case BtcAccountType.P2sh:
    case BtcAccountType.P2wpkh:
    case BtcAccountType.P2tr: {
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
    await Authentication.syncKeyringEncryptionKey();
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

    new SeedlessOnboardingControllerError(
      SeedlessOnboardingControllerErrorType.ChangePasswordError,
      error || 'Password change failed',
    );
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

  await KeyringController.submitPassword(password);

  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    await seedlessChangePassword(newPassword, password);
  }

  await KeyringController.changePassword(newPassword);

  if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
    await Authentication.syncKeyringEncryptionKey();
  }

  await Engine.setSelectedAddress(selectedAddress);
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
