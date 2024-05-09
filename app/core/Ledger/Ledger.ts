import LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';
import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';

/**
 * Add LedgerKeyring.
 *
 * @returns The Ledger Keyring
 */
export const addLedgerKeyring = async (): Promise<LedgerKeyring> => {
  const keyringController = Engine.context.KeyringController;
  return (await keyringController.addNewKeyring(
    ExtendedKeyringTypes.ledger,
  )) as LedgerKeyring;
};

/**
 * Retrieve the existing LedgerKeyring or create a new one.
 *
 * @returns The stored Ledger Keyring
 */
export const getLedgerKeyring = async (): Promise<LedgerKeyring> => {
  const keyringController = Engine.context.KeyringController;
  // There should only be one ledger keyring.
  const keyring = keyringController.getKeyringsByType(
    ExtendedKeyringTypes.ledger,
  );

  // @ts-expect-error The Ledger keyring isn't compatible with our keyring type yet
  return keyring.length ? keyring[0] : await addLedgerKeyring();
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
  const keyring = await getLedgerKeyring();
  keyring.setTransport(transport as unknown as any, deviceId);
  const { appName } = await keyring.getAppAndVersion();
  return appName;
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
  const keyringController = Engine.context.KeyringController;

  const keyring = await getLedgerKeyring();

  if (isAccountImportReq) {
    // @ts-expect-error The Ledger keyring isn't compatible with our keyring type yet
    await keyringController.addNewAccountForKeyring(keyring);
  }
  const address = await keyring.getDefaultAccount();

  return {
    address,
    balance: `0x0`,
  };
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (): Promise<void> => {
  const keyring = await getLedgerKeyring();
  await keyring.openEthApp();
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (): Promise<void> => {
  const keyring = await getLedgerKeyring();
  await keyring.quitApp();
};

/**
 * Forgets the ledger keyring's previous device specific state.
 */
export const forgetLedger = async (): Promise<void> => {
  const { KeyringController } = Engine.context;

  const keyring = await getLedgerKeyring();
  keyring.forgetDevice();

  await KeyringController.persistAllKeyrings();
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (): Promise<string> => {
  const ledgerKeyring = await getLedgerKeyring();
  return ledgerKeyring.deviceId;
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
  await getLedgerKeyring();
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
