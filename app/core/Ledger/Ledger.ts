import LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';

/**
 * Perform an operation with the Ledger keyring.
 *
 * If no Ledger keyring is found, one is created.
 *
 * Note that the `operation` function should only be used for interactions with the ledger keyring.
 * If you call KeyringController methods within this function, it could result in a deadlock.
 *
 * @param operation - The keyring operation to perform.
 * @returns The stored Ledger Keyring
 */
export const withLedgerKeyring = async <CallbackResult = void>(
  operation: (keyring: LedgerKeyring) => Promise<CallbackResult>,
): Promise<CallbackResult> => {
  const keyringController = Engine.context.KeyringController;
  return await keyringController.withKeyring(
    { type: ExtendedKeyringTypes.ledger },
    // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
    operation,
    // TODO: Refactor this to stop creating the keyring on-demand
    // Instead create it only in response to an explicit user action, and do
    // not allow Ledger interactions until after that has been done.
    { createIfMissing: true },
  );
};

/**
 * Connects to the ledger device by requesting some metadata from it.
 *
 * @param transport - The transport to use to connect to the device
 * @param deviceId - The device ID to connect to
 * @returns The name of the currently open application on the device
 */
export const connectLedgerHardware = async (
  transport: BleTransport,
  deviceId: string,
): Promise<string> => {
  const appAndVersion = await withLedgerKeyring(
    async (keyring: LedgerKeyring) => {
      keyring.setTransport(transport as unknown as any, deviceId);
      return await keyring.getAppAndVersion();
    },
  );

  return appAndVersion.appName;
};

/**
 * Retrieve the first account from the Ledger device.
 * @param isAccountImportReq - Whether we need to import a ledger account by calling addNewAccountForKeyring
 * @returns The default (first) account on the device
 */
export const unlockLedgerDefaultAccount = async (
  isAccountImportReq: boolean,
): Promise<{
  address: string;
  balance: string;
}> => {
  const address = await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    if (isAccountImportReq) {
      await keyring.addAccounts(1);
    }
    return await keyring.getDefaultAccount();
  });

  return {
    address,
    balance: `0x0`,
  };
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    await keyring.openEthApp();
  });
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    await keyring.quitApp();
  });
};

/**
 * Forgets the ledger keyring's previous device specific state.
 */
export const forgetLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    await keyring.forgetDevice();
  });
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (): Promise<string> =>
  await withLedgerKeyring(async (keyring: LedgerKeyring) => keyring.deviceId);

/**
 * signTypedMessage from Ledger Keyring
 *
 * @returns signTypedMessage
 */
export const ledgerSignTypedMessage = async (
  messageParams: {
    from: string;
    data: string | Record<string, unknown> | Record<string, unknown>[];
  },
  version: SignTypedDataVersion,
): Promise<string> => {
  await withLedgerKeyring(async (_keyring: LedgerKeyring) => {
    // This is just to trigger the keyring to get created if it doesn't exist already
  });
  const keyringController = Engine.context.KeyringController;
  return await keyringController.signTypedMessage(
    {
      from: messageParams.from,
      // @ts-expect-error TODO: Fix types
      data: messageParams.data,
    },
    version,
  );
};
