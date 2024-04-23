import {
  LedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
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
  keyring.setHdPath("m/44'/60'/0'/0");
  keyring.setDeviceId(deviceId);
  const bridge = keyring.bridge as LedgerMobileBridge;
  await bridge.updateTransportMethod(transport);
  // keyring.setTransport(transport as unknown as any, deviceId);
  const { appName } = await bridge.getAppNameAndVersion();
  return appName;
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (): Promise<void> => {
  const keyring = await getLedgerKeyring();
  const bridge = keyring.bridge as LedgerMobileBridge;
  await bridge.openEthApp();
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (): Promise<void> => {
  const keyring = await getLedgerKeyring();
  const bridge = keyring.bridge as LedgerMobileBridge;
  await bridge.closeApps();
};

/**
 * Forgets the ledger keyring previous device specific state.
 */
export const forgetLedger = async (): Promise<void> => {
  const { KeyringController, PreferencesController } = Engine.context;

  const keyring = await getLedgerKeyring();
  keyring.forgetDevice();

  await KeyringController.persistAllKeyrings();
  PreferencesController.updateIdentities(await KeyringController.getAccounts());
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (): Promise<string> => {
  const ledgerKeyring = await getLedgerKeyring();
  return ledgerKeyring.getDeviceId();
};

export const getLedgerAccountsByPage = async (
  page: number,
): Promise<{ balance: string; address: string; index: number }[]> => {
  try {
    const keyring = await getLedgerKeyring();
    let accounts;
    switch (page) {
      case -1:
        accounts = await keyring.getPreviousPage();
        break;
      case 1:
        accounts = await keyring.getNextPage();
        break;
      default:
        accounts = await keyring.getFirstPage();
    }
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
  await getLedgerKeyring();
  const keyringController = Engine.context.KeyringController;
  return await keyringController.signTypedMessage(
    {
      from: messageParams.from,
      data: messageParams.data as
        | Record<string, unknown>
        | Record<string, unknown>[],
    },
    version,
  );
};
