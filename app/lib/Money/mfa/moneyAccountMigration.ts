import StorageWrapper from '../../../store/storage-wrapper';
import Logger from '../../../util/Logger';

export type MoneyAccountMigrationStatus =
  | 'not_started'
  | 'migrating'
  | 'done'
  | 'failed';

export const MONEY_ACCOUNT_MIGRATION_STORAGE_KEY =
  '@MetaMask:moneyAccountMigration';

const STUB_DELAY_MS = 2000;

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
// Bumped by reset and clear so a migration already running can't write its result.
let generation = 0;
const listeners = new Set<() => void>();

const setStatus = (next: MoneyAccountMigrationStatus) => {
  status = next;
  StorageWrapper.setItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY, next).catch(
    (error: Error) => Logger.error(error, 'Money migration status not saved'),
  );
  listeners.forEach((listener) => listener());
};

// Placeholder until the migration API lands in core (core#10694).
export const moneyAccountMigration = {
  getStatus: (): MoneyAccountMigrationStatus => status,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  start: async (): Promise<void> => {
    const startedIn = generation;
    setStatus('migrating');
    try {
      await new Promise((resolve) => setTimeout(resolve, STUB_DELAY_MS));
    } catch (error) {
      if (startedIn === generation) {
        setStatus('failed');
      }
      throw error;
    }
    if (startedIn !== generation) {
      throw new Error('Money account migration was cancelled');
    }
    setStatus('done');
  },
  reset: () => {
    generation += 1;
    status = 'not_started';
    listeners.forEach((listener) => listener());
  },
  clear: async () => {
    generation += 1;
    status = 'not_started';
    listeners.forEach((listener) => listener());
    await StorageWrapper.removeItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY);
  },
};
