import { toHex } from '@metamask/controller-utils';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { forgetLedger, getDeviceId } from '../../core/Ledger/Ledger';
import { forgetQrDevice, withQrKeyring } from '../../core/QrKeyring/QrKeyring';
import { removeAccountsFromPermissions } from '../../core/Permissions';
import Engine from '../../core/Engine';

/**
 * Metadata captured before a hardware device is forgotten.
 */
export interface ForgotHardwareDeviceInfo {
  keyringType: string;
  deviceModel: string;
}

/**
 * Result of removing an account from its keyring.
 */
export interface RemoveAccountResult {
  didReselectAccount: boolean;
  forgotDevice?: ForgotHardwareDeviceInfo;
}

/**
 * Parameters for removing an account.
 */
export interface RemoveAccountParams {
  address: string;
  keyringType: string;
}

/**
 * Removes an account from its keyring, clears its permissions, and re-selects
 * another account when the removed one was selected.
 *
 * Covers every removable keyring type — hardware (Ledger / QR) and imported
 * private keys. When the removed account was the last one on a hardware
 * keyring, the device is forgotten so the user is not left with a dangling
 * device entry.
 *
 * @param options - Account address and keyring type.
 * @returns Whether the selected account changed and optional device-forget metadata.
 */
export const removeAccount = async ({
  address,
  keyringType,
}: RemoveAccountParams): Promise<RemoveAccountResult> => {
  const { AccountsController, KeyringController } = Engine.context;
  const hexAddress = toHex(address);
  const selectedAccountId =
    AccountsController.state.internalAccounts.selectedAccount;
  const selectedAddress =
    AccountsController.state.internalAccounts.accounts[selectedAccountId]
      ?.address;
  const wasSelected =
    Boolean(selectedAddress) && toHex(selectedAddress) === hexAddress;

  removeAccountsFromPermissions([hexAddress]);
  await KeyringController.removeAccount(hexAddress);

  let didReselectAccount = false;
  if (wasSelected) {
    const accounts = await KeyringController.getAccounts();
    if (accounts.length > 0) {
      Engine.setSelectedAddress(accounts[0]);
      didReselectAccount = true;
    }
  }

  const updatedKeyring = KeyringController.state.keyrings.find(
    (keyring) => keyring.type === keyringType,
  );
  const shouldForgetDevice =
    !updatedKeyring || updatedKeyring.accounts.length === 0;

  if (!shouldForgetDevice) {
    return { didReselectAccount };
  }

  if (keyringType === ExtendedKeyringTypes.ledger) {
    const deviceModel = await getDeviceId();
    await forgetLedger();
    return {
      didReselectAccount,
      forgotDevice: { keyringType, deviceModel },
    };
  }

  if (keyringType === ExtendedKeyringTypes.qr) {
    const deviceModel = await withQrKeyring(async ({ keyring }) =>
      keyring.getName(),
    );
    await forgetQrDevice();
    return {
      didReselectAccount,
      forgotDevice: { keyringType, deviceModel },
    };
  }

  return { didReselectAccount };
};
