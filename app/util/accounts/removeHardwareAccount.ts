import { toHex } from '@metamask/controller-utils';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { forgetLedger, getDeviceId } from '../../core/Ledger/Ledger';
import {
  forgetQrDevice,
  withQrKeyring,
} from '../../core/QrKeyring/QrKeyring';
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
 * Result of removing a hardware account from the keyring.
 */
export interface RemoveHardwareAccountResult {
  didReselectAccount: boolean;
  forgotDevice?: ForgotHardwareDeviceInfo;
}

/**
 * Parameters for removing a hardware account.
 */
export interface RemoveHardwareAccountParams {
  address: string;
  keyringType: string;
}

/**
 * Removes a hardware account, clears permissions, updates the selected account
 * when needed, and forgets the device if no accounts remain on the keyring.
 *
 * @param options - Account address and keyring type.
 * @returns Whether the selected account changed and optional device-forget metadata.
 */
export const removeHardwareAccount = async ({
  address,
  keyringType,
}: RemoveHardwareAccountParams): Promise<RemoveHardwareAccountResult> => {
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
    const deviceModel = await withQrKeyring(
      async ({ keyring }) => await keyring.getName(),
    );
    await forgetQrDevice();
    return {
      didReselectAccount,
      forgotDevice: { keyringType, deviceModel },
    };
  }

  return { didReselectAccount };
};
