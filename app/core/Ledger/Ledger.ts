import {
  KeyringMetadata,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
import { KeyringType } from '@metamask/keyring-api/v2';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../Engine';
import {
  LedgerKeyring as LegacyLedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import type Transport from '@ledgerhq/hw-transport';
import { type Observable } from 'rxjs';
import { type DiscoveredDevice } from '@ledgerhq/device-management-kit';
import {
  LEDGER_BIP44_PATH,
  LEDGER_LEGACY_PATH,
  LEDGER_LIVE_PATH,
} from './constants';
import PAGINATION_OPERATIONS from '../../constants/pagination';
import { strings } from '../../../locales/i18n';
import { keyringTypeToName } from '@metamask/accounts-controller';
import { getChecksumAddress, Hex } from '@metamask/utils';
import { removeAccountsFromPermissions } from '../Permissions';
import { isEthAppNotOpenError, isDisconnectError } from './ledgerErrors';
import DevLogger from '../SDKConnect/utils/DevLogger';

/**
 * The subset of bridge methods used by the connection helpers below. Both
 * `LedgerMobileBridge` (legacy BLE) and `LedgerDmkBridge` (DMK) satisfy this
 * shape. `updateSessionId` is DMK-only; `updateTransportMethod` is used by the
 * legacy path.
 */
interface LedgerBridgeConnection {
  updateSessionId?: (sessionId: string) => Promise<boolean>;
  updateTransportMethod: (transport: Transport | string) => Promise<boolean>;
  getAppNameAndVersion: () => Promise<{ appName: string; version: string }>;
  openEthApp: () => Promise<void>;
  closeApps: () => Promise<void>;
}

/**
 * The subset of DMK-bridge methods used by the adapter's session lifecycle.
 *
 * `LedgerDmkBridge` owns the single `DeviceManagementKit` instance that
 * signing uses, so the adapter routes discovery/connect/monitoring/disconnect
 * through these methods. Sessions created via `connect` live on the bridge's
 * own DMK and are therefore valid for bridge commands (app checks, signing).
 */
interface LedgerDmkBridgeConnection {
  startDiscovering: (args: unknown) => Observable<DiscoveredDevice>;
  connect: (args: { device: DiscoveredDevice }) => Promise<string>;
  readonly onSessionStateChange: Observable<{ connected: boolean }>;
  destroy: () => Promise<void>;
}

const throwIfLedgerOperationAborted = (abortSignal?: AbortSignal) => {
  if (!abortSignal?.aborted) {
    return;
  }

  const error = new Error('Ledger operation aborted');
  error.name = 'LedgerOperationAbortedError';
  throw error;
};

/**
 * Ensure a Ledger keyring exists in the controller before invoking a V2 operation.
 *
 * `withKeyringV2` has no `createIfMissing` option, so callers that need
 * on-demand creation perform the check + create inside `withController` so the
 * operation is serialized by the KeyringController mutex.
 */
async function ensureLedgerKeyringExists(): Promise<void> {
  const keyringController = Engine.context.KeyringController;
  await keyringController.withController(async (controller) => {
    const hasKeyring = controller.keyrings.some(
      ({ keyring }) => keyring.type === LegacyLedgerKeyring.type,
    );
    if (!hasKeyring) {
      await controller.addNewKeyring(LegacyLedgerKeyring.type);
    }
  });
}

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
): Promise<CallbackResult> => {
  DevLogger.log('[Ledger] withLedgerKeyring - entry');
  await ensureLedgerKeyringExists();
  const keyringController = Engine.context.KeyringController;
  return await keyringController.withKeyringV2(
    { type: KeyringType.Ledger },
    async ({ keyring, metadata }) => {
      if (!(keyring instanceof LedgerKeyring)) {
        DevLogger.log(
          '[Ledger] withLedgerKeyring - keyring is NOT LedgerKeyring, got:',
          keyring?.constructor?.name,
        );
        throw new Error('Expected LedgerKeyring');
      }
      return operation({ keyring, metadata });
    },
  );
};

/**
 * Resolve the keyring's DMK bridge. The keyring mutex is held only long enough
 * to fetch the bridge reference; all BLE I/O (connect, destroy, subscribing)
 * happens at the call site, outside the mutex — mirroring
 * {@link connectLedgerDmkHardware}.
 */
const getLedgerDmkBridge = (): Promise<LedgerDmkBridgeConnection> =>
  withLedgerKeyring(
    async ({ keyring }) =>
      keyring.bridge as unknown as LedgerDmkBridgeConnection,
  );

/**
 * Connect a Ledger device via a DMK session and return the running app name.
 *
 * Called by `LedgerBluetoothDMKAdapter` after it has discovered and connected
 * to the device through the shared DMK singleton. The session ID is forwarded
 * to the keyring's bridge via `updateSessionId`.
 *
 * @param sessionId - The DMK session ID from the adapter's connection.
 * @param deviceId - The device ID to connect to.
 * @param abortSignal - Optional abort signal to cancel the operation.
 * @returns The name of the currently open application on the device.
 */
export const connectLedgerDmkHardware = async (
  sessionId: string,
  deviceId: string,
  abortSignal?: AbortSignal,
): Promise<string> => {
  throwIfLedgerOperationAborted(abortSignal);

  DevLogger.log(
    '[Ledger] connectLedgerDmkHardware - sessionId:',
    sessionId,
    'deviceId:',
    deviceId,
  );

  const bridge = await withLedgerKeyring(async ({ keyring }) => {
    keyring.setDeviceId(deviceId);
    const ledgerBridge = keyring.bridge as unknown as LedgerBridgeConnection;
    await ledgerBridge.updateSessionId?.(sessionId);
    return ledgerBridge;
  });

  // Keep the BLE exchange outside the KeyringController mutex. Hardware-wallet
  // flows are serialized at the adapter/provider layer.
  throwIfLedgerOperationAborted(abortSignal);
  const result = await bridge.getAppNameAndVersion();
  DevLogger.log(
    '[Ledger] connectLedgerDmkHardware - app:',
    result.appName,
    result.version,
  );
  return result.appName;
};

/**
 * Connect to a discovered Ledger device via the keyring's bridge. The session
 * is created on the bridge's own DMK instance and stored internally by the
 * bridge, so it is valid for subsequent bridge commands (app checks, signing).
 *
 * @param device - A discovered device (from `getDmk().listenToAvailableDevices`).
 * @returns The DMK session ID.
 */
export const connectLedgerDmkDevice = async (
  device: DiscoveredDevice,
): Promise<string> => {
  const bridge = await getLedgerDmkBridge();
  return bridge.connect({ device });
};

/**
 * Observe the connected/disconnected state of the bridge's DMK session.
 *
 * @returns An observable emitting `{ connected }`. Coarse signal: it does not
 * distinguish a LOCKED device — locked devices are surfaced via the error
 * path (`DeviceLockedError`) instead.
 */
export const getLedgerDmkSessionState = async (): Promise<
  Observable<{ connected: boolean }>
> => {
  const bridge = await getLedgerDmkBridge();
  return bridge.onSessionStateChange;
};

/**
 * Disconnect the bridge's DMK session by tearing down the bridge's transport
 * middleware. The bridge is reconnectable on the next `connect`.
 */
export const disconnectLedgerDmkSession = async (): Promise<void> => {
  const bridge = await getLedgerDmkBridge();
  await bridge.destroy();
};

/**
 * Connect a Ledger device via a legacy BLE transport and return the running
 * app name.
 *
 * Called by `LedgerBluetoothAdapter` after it has discovered and opened a
 * transport to the device through `@ledgerhq/react-native-hw-transport-ble`.
 * The transport is forwarded to the keyring's bridge via
 * `updateTransportMethod`.
 *
 * @param transport - The opened BLE transport from the legacy adapter.
 * @param deviceId - The device ID to connect to.
 * @param abortSignal - Optional abort signal to cancel the operation.
 * @returns The name of the currently open application on the device.
 */
export const connectLedgerHardware = async (
  transport: Transport,
  deviceId: string,
  abortSignal?: AbortSignal,
): Promise<string> => {
  throwIfLedgerOperationAborted(abortSignal);

  DevLogger.log(
    '[Ledger] connectLedgerHardware (legacy) - deviceId:',
    deviceId,
  );

  const bridge = await withLedgerKeyring(async ({ keyring }) => {
    keyring.setDeviceId(deviceId);
    const ledgerBridge = keyring.bridge as unknown as LedgerBridgeConnection;
    await ledgerBridge.updateTransportMethod(transport);
    return ledgerBridge;
  });

  // Keep the BLE exchange outside the KeyringController mutex. Hardware-wallet
  // flows are serialized at the adapter/provider layer.
  throwIfLedgerOperationAborted(abortSignal);
  const { appName, version } = await bridge.getAppNameAndVersion();
  DevLogger.log(
    '[Ledger] connectLedgerHardware (legacy) - app:',
    appName,
    version,
  );
  return appName;
};

/**
 * Automatically opens the Ethereum app on the Ledger device.
 */
export const openEthereumAppOnLedger = async (): Promise<void> => {
  DevLogger.log('[Ledger] openEthereumAppOnLedger - entry');
  const bridge = await withLedgerKeyring(
    async ({ keyring }) => keyring.bridge as unknown as LedgerBridgeConnection,
  );
  await bridge.openEthApp();
  DevLogger.log('[Ledger] openEthereumAppOnLedger - openEthApp succeeded');
};

/**
 * Automatically closes the current app on the Ledger device.
 */
export const closeRunningAppOnLedger = async (): Promise<void> => {
  DevLogger.log('[Ledger] closeRunningAppOnLedger - entry');
  const bridge = await withLedgerKeyring(
    async ({ keyring }) => keyring.bridge as unknown as LedgerBridgeConnection,
  );
  await bridge.closeApps();
  DevLogger.log('[Ledger] closeRunningAppOnLedger - closeApps succeeded');
};

/**
 * Forgets the ledger device.
 */
export const forgetLedger = async (): Promise<void> => {
  DevLogger.log('[Ledger] forgetLedger - entry');
  await withLedgerKeyring(async ({ keyring }) => {
    // Permissions need to be updated before the hardware wallet is forgotten.
    // This is because `removeAccountsFromPermissions` relies on the account
    // existing in AccountsController in order to resolve a hex address
    // back into CAIP Account Id. Hex addresses are used in
    // `removeAccountsFromPermissions` because too many places in the UI still
    // operate on hex addresses rather than CAIP Account Id.
    const accounts = await keyring.getAccounts();
    removeAccountsFromPermissions(
      accounts.map(({ address }) => getChecksumAddress(address as Hex)),
    );
    await keyring.forgetDevice();
    DevLogger.log('[Ledger] forgetLedger - forgetDevice succeeded');
  });
};

/**
 * Get DeviceId from Ledger Keyring
 *
 * @returns The DeviceId
 */
export const getDeviceId = async (): Promise<string> =>
  await withLedgerKeyring(async ({ keyring }) => keyring.getDeviceId());

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
  await withLedgerKeyring(async ({ keyring }) => {
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
  await withLedgerKeyring(async ({ keyring }) => keyring.hdPath);

/**
 * Get Ledger Accounts
 * @returns The Ledger Accounts
 */
export const getLedgerAccounts = async (): Promise<string[]> =>
  await withLedgerKeyring(async ({ keyring }) => {
    const accounts = await keyring.getAccounts();
    DevLogger.log('[Ledger] getLedgerAccounts - count:', accounts.length);
    return accounts.map(({ address }) => address);
  });

/**
 * Unlock Ledger Accounts by page
 * @param operation - the operation number, <br> 0: Get First Page<br> 1: Get Next Page <br> -1: Get Previous Page
 * @return The Ledger Accounts
 */
export const getLedgerAccountsByOperation = async (
  operation: number,
): Promise<{ balance: string; address: string; index: number }[]> => {
  DevLogger.log(
    '[Ledger] getLedgerAccountsByOperation - entry, operation:',
    operation,
  );
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
    });

    return accounts.map((account) => ({
      ...account,
      balance: '0x0',
    }));
  } catch (e) {
    DevLogger.log('[DMK] getLedgerAccountsByOperation - error:', e);
    /* istanbul ignore next */
    if (isEthAppNotOpenError(e)) {
      throw new Error(strings('ledger.eth_app_not_open_message'));
    }
    const errorMessage =
      e instanceof Error
        ? e.message
        : e && typeof e === 'object' && 'message' in e
          ? String(e.message)
          : '';

    if (
      isDisconnectError(e) ||
      /disconnected|disconnect|connection lost/i.test(errorMessage)
    ) {
      throw new Error(strings('ledger.ledger_disconnected'));
    }
    DevLogger.log('[DMK] getLedgerAccountsByOperation - UNHANDLED error:', e);
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
  DevLogger.log(
    '[Ledger] ledgerSignTypedMessage - entry, from:',
    messageParams.from,
  );
  await withLedgerKeyring(async () => {
    // This is just to trigger the keyring to get created if it doesn't exist already
  });
  const keyringController = Engine.context.KeyringController;
  DevLogger.log('[Ledger] ledgerSignTypedMessage - calling signTypedMessage');
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
export const unlockLedgerWalletAccount = async (index: number) => {
  const accountsController = Engine.context.AccountsController;
  try {
    DevLogger.log('[Ledger] unlockLedgerWalletAccount - entry, index:', index);
    const { unlockAccount, name } = await withLedgerKeyring(
      async ({ keyring }) => {
        const existingAccounts = await keyring.getAccounts();
        const keyringName = keyringTypeToName(ExtendedKeyringTypes.ledger);
        const accountName = `${keyringName} ${existingAccounts.length + 1}`;

        if (await checkAccountNameExists(accountName)) {
          throw new Error(
            strings('ledger.account_name_existed', { accountName }),
          );
        }

        // Ledger Live mode uses a per-account hardened third segment;
        // Legacy and BIP-44 modes are `${hdPath}/${index}`.
        // NOTE: Use `keyring.hdPath` (that is set using `setHDPath` function) + We force
        // the type, since `createAccounts` expects a specific derivation path format.
        const derivationPath: `m/${string}` =
          keyring.hdPath === LEDGER_LIVE_PATH
            ? `m/44'/60'/${index}'/0/0`
            : (`${keyring.hdPath}/${index}` as `m/${string}`);
        const [account] = await keyring.createAccounts({
          type: 'bip44:derive-path',
          entropySource: keyring.entropySource,
          derivationPath,
        });

        if (!account) {
          throw new Error(`No account created for device: Ledger`);
        }
        return {
          unlockAccount: account.address,
          name: accountName,
        };
      },
    );

    const account = accountsController.getAccountByAddress(unlockAccount);

    if (account && name !== account.metadata.name) {
      accountsController.setAccountName(account.id, name);
    }
    DevLogger.log(
      '[Ledger] unlockLedgerWalletAccount - success, account:',
      unlockAccount,
    );
    Engine.setSelectedAddress(unlockAccount);
  } catch (e) {
    DevLogger.log(
      '[Ledger] unlockLedgerWalletAccount - ERROR:',
      e instanceof Error ? e.message : String(e),
    );
    if (isEthAppNotOpenError(e)) {
      throw new Error(strings('ledger.eth_app_not_open_message'));
    }
    throw e;
  }
};
