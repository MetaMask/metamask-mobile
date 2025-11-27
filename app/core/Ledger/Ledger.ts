import type BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import {
  KeyringMetadata,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
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
import { removeAccountsFromPermissions } from '../Permissions';

export const getLedgerKeyringIdByDeviceId = async (
  deviceId: string,
): Promise<string | undefined> => {
  const { KeyringController } = Engine.context;
  const ledgerKeyrings = KeyringController.state.keyrings.filter(
    (keyring) => keyring.type === ExtendedKeyringTypes.ledger,
  );

  let ledgerKeyringId: string | undefined;
  for (let i = 0; i < ledgerKeyrings.length; i++) {
    const { matchingDeviceId } = await KeyringController.withKeyring(
      { type: ExtendedKeyringTypes.ledger, index: i },
      async ({ keyring }: { keyring: LedgerKeyring }) => ({
        matchingDeviceId: keyring.getDeviceId() === deviceId,
      }),
    );

    if (matchingDeviceId) {
      ledgerKeyringId = ledgerKeyrings[i].metadata.id;
      break;
    }
  }
  return ledgerKeyringId;
};

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
  operation: (selectedKeyring: {
    keyring: LedgerKeyring;
    metadata: KeyringMetadata;
  }) => Promise<CallbackResult>,
  keyringId: string,
): Promise<CallbackResult> => {
  const keyringController = Engine.context.KeyringController;

  return await keyringController.withKeyring(
    { id: keyringId },
    operation,
    // TODO: Refactor this to stop creating the keyring on-demand
    // Instead create it only in response to an explicit user action, and do
    // not allow Ledger interactions until after that has been done.
    { createIfMissing: true },
  );
};

export const createNewLedgerKeyring = async (
  deviceId: string,
): Promise<string> => {
  const keyringController = Engine.context.KeyringController;
  const newLedgerKeyring = await keyringController.addNewKeyring(
    ExtendedKeyringTypes.ledger,
  );

  await withLedgerKeyring(async ({ keyring }) => {
    keyring.setHdPath(LEDGER_LIVE_PATH);
    keyring.setDeviceId(deviceId);
  }, newLedgerKeyring.id);

  return newLedgerKeyring.id;
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
  const ledgerKeyringId = await getLedgerKeyringIdByDeviceId(deviceId);

  if (!ledgerKeyringId) {
    throw new Error('Ledger keyring not found');
  }

  const appAndVersion = await withLedgerKeyring(async ({ keyring }) => {
    keyring.setHdPath(LEDGER_LIVE_PATH);
    keyring.setDeviceId(deviceId);

    const bridge = keyring.bridge as LedgerMobileBridge;
    await bridge.updateTransportMethod(transport);
    return await bridge.getAppNameAndVersion();
  }, ledgerKeyringId);

  return appAndVersion.appName;
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (
  keyringId: string,
): Promise<void> => {
  await withLedgerKeyring(async ({ keyring }) => {
    const bridge = keyring.bridge as LedgerMobileBridge;
    await bridge.openEthApp();
  }, keyringId);
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (
  keyringId: string,
): Promise<void> => {
  await withLedgerKeyring(async ({ keyring }) => {
    const bridge = keyring.bridge as LedgerMobileBridge;
    await bridge.closeApps();
  }, keyringId);
};

/**
 * Forgets the ledger device.
 */
export const forgetLedger = async (keyringId: string): Promise<void> => {
  await withLedgerKeyring(async ({ keyring }) => {
    // Permissions need to be updated before the hardware wallet is forgotten.
    // This is because `removeAccountsFromPermissions` relies on the account
    // existing in AccountsController in order to resolve a hex address
    // back into CAIP Account Id. Hex addresses are used in
    // `removeAccountsFromPermissions` because too many places in the UI still
    // operate on hex addresses rather than CAIP Account Id.
    const accounts = await keyring.getAccounts();
    removeAccountsFromPermissions(accounts);
    keyring.forgetDevice();
  }, keyringId);
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (keyringId: string): Promise<string> =>
  await withLedgerKeyring(
    async ({ keyring }) => keyring.getDeviceId(),
    keyringId,
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
export const setHDPath = async (path: string, keyringId: string) => {
  await withLedgerKeyring(async ({ keyring }) => {
    if (isValidPath(path)) {
      keyring.setHdPath(path);
    } else {
      throw new Error(strings('ledger.hd_path_error', { path }));
    }
  }, keyringId);
};

/**
 * Get HD Path from Ledger Keyring
 *
 * @returns The HD Path
 */
export const getHDPath = async (keyringId: string): Promise<string> =>
  await withLedgerKeyring(async ({ keyring }) => keyring.hdPath, keyringId);

/**
 * Get Ledger Accounts
 * @returns The Ledger Accounts
 */
export const getLedgerAccounts = async (keyringId: string): Promise<string[]> =>
  await withLedgerKeyring(
    async ({ keyring }) => keyring.getAccounts(),
    keyringId,
  );

/**
 * Unlock Ledger Accounts by page
 * @param operation - the operation number, <br> 0: Get First Page<br> 1: Get Next Page <br> -1: Get Previous Page
 * @return The Ledger Accounts
 */
export const getLedgerAccountsByOperation = async (
  operation: number,
  keyringId: string,
): Promise<{ balance: string; address: string; index: number }[]> => {
  try {
    const accounts = await withLedgerKeyring(async ({ keyring }) => {
      switch (operation) {
        case PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE:
          return await keyring.getPreviousPage();
        case PAGINATION_OPERATIONS.GET_NEXT_PAGE:
          return await keyring.getNextPage();
        default:
          return await keyring.getFirstPage();
      }
    }, keyringId);

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
  keyringId: string,
): Promise<string> => {
  await withLedgerKeyring(async ({ keyring }) => {
    // This is just to trigger the keyring to get created if it doesn't exist already
  }, keyringId);
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
  const accounts = Object.values(
    accountsController.state.internalAccounts.accounts,
  );
  const existingAccount = accounts.find(
    (account) => account.metadata.name === accountName,
  );
  return !!existingAccount;
};

/**
 * Unlock Ledger Wallet Account with index, and add it that account to metamask
 *
 * @param index - The index of the account to unlock
 */
export const unlockLedgerWalletAccount = async (
  index: number,
  keyringId: string,
) => {
  const accountsController = Engine.context.AccountsController;
  const { unlockAccount, name } = await withLedgerKeyring(
    async ({ keyring }) => {
      const existingAccounts = await keyring.getAccounts();
      const keyringName = keyringTypeToName(ExtendedKeyringTypes.ledger);
      const accountName = `${keyringName} ${keyringId} ${existingAccounts.length + 1}`;

      if (await checkAccountNameExists(accountName)) {
        throw new Error(
          strings('ledger.account_name_existed', { accountName }),
        );
      }

      keyring.setAccountToUnlock(index);
      const accounts = await keyring.addAccounts(1);
      return {
        unlockAccount: accounts[accounts.length - 1],
        name: accountName,
      };
    },
    keyringId,
  );

  const account = accountsController.getAccountByAddress(unlockAccount);

  if (account && name !== account.metadata.name) {
    accountsController.setAccountName(account.id, name);
  }
};
