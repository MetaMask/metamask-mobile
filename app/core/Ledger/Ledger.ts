import Engine from '../Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

// Mock interface for the SerializationOptions
interface SerializationOptions {
  vault: any;
  keyrings: any[];
  isUnlocked: boolean;
  encryptionKey: string;
  encryptionSalt: string;
}

// Mock interface for the LedgerKeyring
interface LedgerKeyring {
  setTransport: (transport: any, deviceId: string) => void;
  getAppAndVersion: () => Promise<{ appName: string }>;
  getDefaultAccount: () => Promise<string>;
  openEthApp: () => Promise<void>;
  quitApp: () => Promise<void>;
  forgetDevice: () => void;
  deserialize: (keyringSerialized: SerializationOptions) => void;
  deviceId: string;
  getName: () => string;
}

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
  const keyring = keyringController().getKeyringsByType(
    ExtendedKeyringTypes.ledger,
  )[0] as unknown as LedgerKeyring;

  if (keyring) {
    return keyring;
  }

  return await addLedgerKeyring();
};

/**
 * Restores the Ledger Keyring. This is only used at the time the user resets the account's password at the moment.
 *
 * @param keyringSerialized - The serialized keyring;
 */
export const restoreLedgerKeyring = async (
  keyringSerialized: SerializationOptions,
): Promise<void> => {
  const keyringController = Engine.context.KeyringController;

  (await getLedgerKeyring()).deserialize(keyringSerialized);
  keyringController.updateIdentities(await keyringController.getAccounts());
};

/**
 * Connects to the ledger device by requesting some metadata from it.
 *
 * @param transport - The transport to use to connect to the device
 * @param deviceId - The device ID to connect to
 * @returns The name of the currently open application on the device
 */
export const connectLedgerHardware = async (
  transport: any,
  deviceId: string,
): Promise<string> => {
  const keyring = await getLedgerKeyring();
  keyring.setTransport(transport as unknown as any, deviceId);
  const { appName } = await keyring.getAppAndVersion();
  return appName;
};

/**
 * Retrieve the first account from the Ledger device.
 *
 * @returns The default (first) account on the device
 */
export const unlockLedgerDefaultAccount = async (): Promise<{
  address: string;
  balance: string;
}> => {
  const keyringController = Engine.context.KeyringController;
  const preferencesController = Engine.context.PreferencesController;
  const keyring = await getLedgerKeyring();
  const oldAccounts = await keyringController.getAccounts();
  await keyringController.addNewAccountForKeyring(keyring);
  const newAccounts = await keyringController.getAccounts();

  keyringController.updateIdentities(newAccounts);
  newAccounts.forEach((address: string) => {
    if (!oldAccounts.includes(address)) {
      if (keyringController.setAccountLabel) {
        // The first ledger account is always returned.
        keyringController.setAccountLabel(address, `${keyring.getName()} 1`);
      }
      preferencesController.setSelectedAddress(address);
    }
  });
  await keyringController.persistAllKeyrings();

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
  const keyringController = Engine.context.KeyringController;
  const preferencesController = Engine.context.PreferencesController;
  const keyring = await getLedgerKeyring();
  keyring.forgetDevice();

  const accounts: string[] = await keyringController.getAccounts();
  preferencesController.setSelectedAddress(accounts[0]);

  await keyringController.persistAllKeyrings();
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
      data: messageParams.data as
        | Record<string, unknown>
        | Record<string, unknown>[],
    },
    { version },
  );
};
