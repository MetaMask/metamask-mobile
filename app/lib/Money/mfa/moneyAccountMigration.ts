import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import Logger from '../../../util/Logger';
import { describeError } from '../../../util/describeError';

export type MoneyAccountMigrationStatus =
  | 'not_started'
  | 'migrating'
  | 'done'
  | 'failed';

export const MONEY_ACCOUNT_MIGRATION_STORAGE_KEY =
  '@MetaMask:moneyAccountMigration';

export const MIGRATION_POLL_INTERVAL_MS = 4_000;
export const MIGRATION_POLL_TIMEOUT_MS = 5 * 60_000;

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
// Bumped by reset and clear so a migration already running can't write its result.
let generation = 0;
const listeners = new Set<() => void>();

const isAnyMoneyAccountMigrating = () =>
  Object.values(
    Engine.context.MoneyAccountLifecycleController.state.moneyAccounts,
  ).some((lifecycle) => lifecycle.type === 'migrating');

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForMigrationToFinish = async (startedIn: number) => {
  const deadline = Date.now() + MIGRATION_POLL_TIMEOUT_MS;
  for (;;) {
    if (startedIn !== generation) {
      return;
    }
    await Engine.context.MoneyAccountLifecycleController.refresh();
    if (!isAnyMoneyAccountMigrating()) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error('Money account migration did not finish in time');
    }
    await wait(MIGRATION_POLL_INTERVAL_MS);
  }
};

const setStatus = (next: MoneyAccountMigrationStatus) => {
  status = next;
  StorageWrapper.setItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY, next).catch(
    (error: Error) => Logger.error(error, 'Money migration status not saved'),
  );
  listeners.forEach((listener) => listener());
};

/**
 * Moves the Money account to the MPC account that 2-step verification
 * protects.
 */
export const moneyAccountMigration = {
  getStatus: (): MoneyAccountMigrationStatus => status,
  getLastError: (): string | undefined => lastError,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Starts the migration, or resumes one that was interrupted. */
  start: async (): Promise<void> => {
    const startedIn = generation;
    setStatus('migrating');
    try {
      await Engine.context.MoneyAccountLifecycleController.startMigration();
      await waitForMigrationToFinish(startedIn);
      if (startedIn !== generation) {
        throw new Error('Money account migration was cancelled');
      }
    } catch (error) {
      if (startedIn === generation) {
        lastError = describeError(error);
        Logger.error(error as Error, 'Money account migration failed');
        setStatus('failed');
      }
      throw error;
    }
    setStatus('done');
  },
  reset: () => {
    generation += 1;
    status = 'not_started';
    listeners.forEach((listener) => listener());
  },
  /** Forgets the saved status, e.g. when the wallet is reset. */
  clear: async () => {
    generation += 1;
    status = 'not_started';
    listeners.forEach((listener) => listener());
    await StorageWrapper.removeItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY);
  },
};
