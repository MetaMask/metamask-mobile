import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { describeError } from '../../../../util/describeError';

export type MoneyAccountMigrationStatus =
  | 'not_started'
  | 'migrating'
  | 'done'
  | 'failed';

export const MONEY_ACCOUNT_MIGRATION_STORAGE_KEY =
  '@MetaMask:moneyAccountMigration';

const STATUSES: MoneyAccountMigrationStatus[] = [
  'not_started',
  'migrating',
  'done',
  'failed',
];

const readPersisted = (): MoneyAccountMigrationStatus => {
  const saved = StorageWrapper.getItemSync(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY);
  return STATUSES.find((value) => value === saved) ?? 'not_started';
};

let status: MoneyAccountMigrationStatus = readPersisted();
let lastError: string | undefined;
const listeners = new Set<() => void>();

const setStatus = (next: MoneyAccountMigrationStatus) => {
  status = next;
  StorageWrapper.setItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY, next).catch(
    (error: Error) => Logger.error(error, 'Money migration status not saved'),
  );
  listeners.forEach((listener) => listener());
};

/**
 * Moves the Money account to the MPC account that 2-step verification
 * protects: creates the MPC Money account and makes it the default. The status
 * is saved on the device so an interrupted migration resumes.
 */
export const moneyAccountMigration = {
  getStatus: (): MoneyAccountMigrationStatus => status,
  /** The last failure's name, message and stack, for QA tools. */
  getLastError: (): string | undefined => lastError,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Starts the migration, or resumes one that was interrupted. */
  start: async (): Promise<void> => {
    setStatus('migrating');
    try {
      const { MoneyAccountController } = Engine.context;
      const account = await MoneyAccountController.createMoneyAccount({
        type: KeyringAccountEntropyTypeOption.Mpc,
      });
      MoneyAccountController.setDefaultMoneyAccount(account.id);
    } catch (error) {
      lastError = describeError(error);
      Logger.error(error as Error, 'Money account migration failed');
      setStatus('failed');
      throw error;
    }
    setStatus('done');
  },
  reset: () => {
    status = 'not_started';
    listeners.forEach((listener) => listener());
  },
  /** Forgets the saved status, e.g. when the wallet is reset. */
  clear: async () => {
    status = 'not_started';
    listeners.forEach((listener) => listener());
    await StorageWrapper.removeItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY);
  },
};
