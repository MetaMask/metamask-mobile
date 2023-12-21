import Engine from '../Engine';
import {
  KeyringController,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

interface SerializationOptions {
  vault: any;
  keyrings: any[];
  isUnlocked: boolean;
  encryptionKey: string;
  encryptionSalt: string;
}

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
 * Get EthKeyringController from KeyringController
 *
 * @returns The EthKeyringController
 */
const getEthKeyringController = () => {
  const keyringController: KeyringController = Engine.context.KeyringController;
  return keyringController.getEthKeyringController();
};

/**
 * A method replicate #fullupdate from the keyring controller.
 */
export const syncKeyringState = async (): Promise<void> => {
  const keyringController = Engine.context.KeyringController;
  const ethKeyringController = getEthKeyringController();
  const { vault } = ethKeyringController.store.getState();
  const { keyrings, isUnlocked, encryptionKey, encryptionSalt } =
    ethKeyringController.memStore.getState();

  keyringController.update(() => ({
    vault,
    keyrings,
    isUnlocked,
    encryptionKey,
    encryptionSalt,
  }));
};

/**
 * Add LedgerKeyring.
 *
 * @returns The Ledger Keyring
 */
export const addLedgerKeyring = async (): Promise<LedgerKeyring> =>
  (await getEthKeyringController().addNewKeyring(
    ExtendedKeyringTypes.ledger,
  )) as unknown as LedgerKeyring;

/**
 * Retrieve the existing LedgerKeyring or create a new one.
 *
 * @returns The stored Ledger Keyring
 */
export const getLedgerKeyring = async (): Promise<LedgerKeyring> => {
  const keyring = getEthKeyringController().getKeyringsByType(
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
  const ethKeyringController = getEthKeyringController();

  (await getLedgerKeyring()).deserialize(keyringSerialized);
  keyringController.updateIdentities(await ethKeyringController.getAccounts());
  await syncKeyringState();
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
  const ethKeyringController = getEthKeyringController();
  const keyring = await getLedgerKeyring();
  const oldAccounts = await ethKeyringController.getAccounts();
  await ethKeyringController.addNewAccount(keyring);
  const newAccounts = await ethKeyringController.getAccounts();

  keyringController.updateIdentities(newAccounts);
  newAccounts.forEach((address: string) => {
    if (!oldAccounts.includes(address)) {
      if (keyringController.setAccountLabel) {
        // The first ledger account is always returned.
        keyringController.setAccountLabel(address, `${keyring.getName()} 1`);
      }
      keyringController.setSelectedAddress(address);
    }
  });
  await ethKeyringController.persistAllKeyrings();
  await syncKeyringState();

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
  const ethKeyringController = getEthKeyringController();
  const keyring = await getLedgerKeyring();
  keyring.forgetDevice();

  const accounts: string[] = await ethKeyringController.getAccounts();
  keyringController.setSelectedAddress(accounts[0]);

  await ethKeyringController.persistAllKeyrings();
  await syncKeyringState();
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
  return await getEthKeyringController().signTypedMessage(
    {
      from: messageParams.from,
      data: messageParams.data as
        | Record<string, unknown>
        | Record<string, unknown>[],
    },
    { version },
  );
};
