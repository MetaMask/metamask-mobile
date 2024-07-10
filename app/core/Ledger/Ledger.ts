import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';
import {
  LedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import LEDGER_HD_PATH from './constants';

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
      keyring.setHdPath(LEDGER_HD_PATH);
      keyring.setDeviceId(deviceId);

      const bridge = keyring.bridge as LedgerMobileBridge;
      await bridge.updateTransportMethod(transport);
      return await bridge.getAppNameAndVersion();
    },
  );

  return appAndVersion.appName;
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    const bridge = keyring.bridge as LedgerMobileBridge;
    await bridge.openEthApp();
  });
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    const bridge = keyring.bridge as LedgerMobileBridge;
    await bridge.closeApps();
  });
};

/**
 * Forgets the ledger keyring's previous device specific state.
 */
export const forgetLedger = async (): Promise<void> => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    keyring.forgetDevice();
  });
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (): Promise<string> =>
  await withLedgerKeyring(async (keyring: LedgerKeyring) =>
    keyring.getDeviceId(),
  );

/**
 * Unlock Ledger Accounts by page
 * @param page - The page number to unlock
 */
export const getLedgerAccountsByPage = async (
  page: number,
): Promise<{ balance: string; address: string; index: number }[]> => {
  try {
    const accounts = await withLedgerKeyring(async (keyring: LedgerKeyring) => {
      switch (page) {
        case -1:
          return await keyring.getPreviousPage();
        case 1:
          return await keyring.getNextPage();
        default:
          return await keyring.getFirstPage();
      }
    });

    return accounts.map((account) => ({
      ...account,
      balance: '0x0',
    }));
  } catch (e) {
    /* istanbul ignore next */
    throw new Error(`Unspecified error when connect Ledger Hardware, ${e}`);
  }
};

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

/**
 * Unlock Ledger Wallet Account with index, and add it that account to metamask
 *
 * @param index - The index of the account to unlock
 */
export const unlockLedgerWalletAccount = async (index: number) => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    keyring.setAccountToUnlock(index);
    await keyring.addAccounts(1);
  });
};
