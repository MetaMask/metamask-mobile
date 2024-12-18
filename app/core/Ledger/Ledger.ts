import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';
import {
  LedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from './constants';
import PAGINATION_OPERATIONS from '../../constants/pagination';
import { strings } from '../../../locales/i18n';
import { keyringTypeToName } from '@metamask/accounts-controller';

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
      keyring.setHdPath(LEDGER_LIVE_PATH);
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
 * Forgets the ledger device.
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
 * Check if the path is valid
 * @param path - The HD Path to check
 * @returns Whether the path is valid
 */
export const isValidPath = (path: string): boolean => {
  if (!path) return false;
  if (!path.startsWith("m/44'/60'")) return false;
  switch (path) {
    case LEDGER_LIVE_PATH:
    case LEDGER_LEGACY_PATH:
    case LEDGER_BIP44_PATH:
      return true;
    default:
      return false;
  }
};

/**
 * Set HD Path for Ledger Keyring
 * @param path - The HD Path to set
 */
export const setHDPath = async (path: string) => {
  await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    if (isValidPath(path)) {
      keyring.setHdPath(path);
    } else {
      throw new Error(strings('ledger.hd_path_error', { path }));
    }
  });
};

/**
 * Get HD Path from Ledger Keyring
 *
 * @returns The HD Path
 */
export const getHDPath = async (): Promise<string> =>
  await withLedgerKeyring(async (keyring: LedgerKeyring) => keyring.hdPath);

/**
 * Get Ledger Accounts
 * @returns The Ledger Accounts
 */
export const getLedgerAccounts = async (): Promise<string[]> =>
  await withLedgerKeyring(async (keyring: LedgerKeyring) =>
    keyring.getAccounts(),
  );

/**
 * Unlock Ledger Accounts by page
 * @param operation - the operation number, <br> 0: Get First Page<br> 1: Get Next Page <br> -1: Get Previous Page
 * @return The Ledger Accounts
 */
export const getLedgerAccountsByOperation = async (
  operation: number,
): Promise<{ balance: string; address: string; index: number }[]> => {
  try {
    const accounts = await withLedgerKeyring(async (keyring: LedgerKeyring) => {
      switch (operation) {
        case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
          return await keyring.getPreviousPage();
        case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
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
    throw new Error(strings('ledger.unspecified_error_during_connect'));
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
 * Check if account name exists in the accounts list
 *
 * @param accountName - The account name to check
 */
export const checkAccountNameExists = async (accountName: string) => {
  const accountsController = Engine.context.AccountsController;
  const accounts =  Object.values(accountsController.state.internalAccounts.accounts);
  const existingAccount = accounts.find((account) => account.metadata.name === accountName);
  return !!existingAccount;
};

/**
 * Unlock Ledger Wallet Account with index, and add it that account to metamask
 *
 * @param index - The index of the account to unlock
 */
export const unlockLedgerWalletAccount = async (index: number) => {
  const accountsController = Engine.context.AccountsController;
  const { unlockAccount, name}  = await withLedgerKeyring(async (keyring: LedgerKeyring) => {
    const existingAccounts = await keyring.getAccounts();
    const keyringName = keyringTypeToName(ExtendedKeyringTypes.ledger);
    const accountName = `${keyringName} ${existingAccounts.length + 1}`;

    if(await checkAccountNameExists(accountName)) {
      throw new Error(strings('ledger.account_name_existed', { accountName }));
    }

    keyring.setAccountToUnlock(index);
    const accounts = await keyring.addAccounts(1);
    return { unlockAccount: accounts[accounts.length - 1], name: accountName };
  });

  const account =
    accountsController.getAccountByAddress(unlockAccount);

  if(account && name !== account.metadata.name) {
    accountsController.setAccountName(account.id, name);
  }
};

