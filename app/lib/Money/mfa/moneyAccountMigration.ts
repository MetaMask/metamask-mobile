import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import Logger from '../../../util/Logger';
import { describeError } from '../../../util/describeError';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import {
  getErrorName,
  getMoneyUpgradeStepFailure,
  trackMoneyMfaSetupStatus,
  type MoneyMfaSetupFailedStep,
  type MoneyMfaSetupTrigger,
} from '../../../util/analytics/moneyMfaTracking';

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
// Failed runs since the last success, so each run reports its attempt number.
let failedAttempts = 0;
// Bumped by reset and clear so a migration already running can't write its result.
let generation = 0;
const listeners = new Set<() => void>();

const isAnyMoneyAccountMigrating = () =>
  Object.values(
    Engine.context.MoneyAccountLifecycleController.state.moneyAccounts,
  ).some((lifecycle) => lifecycle.type === 'migrating');

const hasMigratedMoneyAccount = () =>
  Object.values(
    Engine.context.MoneyAccountLifecycleController.state.moneyAccounts,
  ).some((lifecycle) => lifecycle.type === 'mfa');

// A resumed or retried run may find CHOMP already done, e.g. after the app was killed mid-run; startMigration resumes a partial one.
const startMigrationUnlessDone = async (trigger: MoneyMfaSetupTrigger) => {
  if (trigger !== 'turn_on') {
    await Engine.context.MoneyAccountLifecycleController.refresh();
    if (hasMigratedMoneyAccount()) {
      return;
    }
  }
  await Engine.context.MoneyAccountLifecycleController.startMigration();
};

class MigrationTimeoutError extends Error {
  constructor() {
    super('Money account migration did not finish in time');
    this.name = 'MigrationTimeoutError';
  }
}

const wait = async (ms: number) =>
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
      throw new MigrationTimeoutError();
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

export const moneyAccountMigration = {
  getStatus: (): MoneyAccountMigrationStatus => status,
  getLastError: (): string | undefined => lastError,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  start: async (trigger: MoneyMfaSetupTrigger = 'turn_on'): Promise<void> => {
    const startedIn = generation;
    const attempt = failedAttempts + 1;
    const startedAt = Date.now();
    let phase: MoneyMfaSetupFailedStep = 'start_migration';
    setStatus('migrating');
    trackMoneyMfaSetupStatus({ status: 'started', trigger, attempt });
    const setupTrace = trace({
      name: TraceName.MoneyMfaSetup,
      op: TraceOperation.MoneyMfaSetup,
      tags: { trigger, attempt },
      maxLifetimeMs: MIGRATION_POLL_TIMEOUT_MS + 60_000,
    });
    try {
      await trace(
        {
          name: TraceName.MoneyMfaMigrationStart,
          op: TraceOperation.MoneyMfaSetup,
          parentContext: setupTrace,
        },
        async () => startMigrationUnlessDone(trigger),
      );
      phase = 'funds_transfer_status';
      await trace(
        {
          name: TraceName.MoneyMfaMigrationTransfer,
          op: TraceOperation.MoneyMfaSetup,
          parentContext: setupTrace,
        },
        async () => waitForMigrationToFinish(startedIn),
      );
      if (startedIn !== generation) {
        throw new Error('Money account migration was cancelled');
      }
    } catch (error) {
      if (startedIn === generation) {
        const upgradeFailure = getMoneyUpgradeStepFailure(error);
        const failedStep =
          upgradeFailure?.step ??
          (error instanceof MigrationTimeoutError
            ? 'funds_transfer_timeout'
            : phase);
        const errorName = getErrorName(upgradeFailure?.cause ?? error);
        const isTerminal = upgradeFailure?.isTerminal ?? false;
        const durationMs = Date.now() - startedAt;
        failedAttempts += 1;
        lastError = describeError(error);
        Logger.error(error as Error, {
          tags: {
            feature: 'money-mfa',
            money_mfa_failed_step: failedStep,
            money_mfa_trigger: trigger,
          },
          context: {
            name: 'money_mfa_setup',
            data: {
              attempt,
              duration_ms: durationMs,
              is_terminal: isTerminal,
              error_name: errorName,
            },
          },
        });
        trackMoneyMfaSetupStatus({
          status: 'failed',
          trigger,
          attempt,
          duration_ms: durationMs,
          failed_step: failedStep,
          error_name: errorName,
          is_terminal: isTerminal,
        });
        endTrace({
          name: TraceName.MoneyMfaSetup,
          status: 'error',
          data: { failed_step: failedStep },
        });
        setStatus('failed');
      } else {
        endTrace({ name: TraceName.MoneyMfaSetup, status: 'error' });
      }
      throw error;
    }
    failedAttempts = 0;
    trackMoneyMfaSetupStatus({
      status: 'completed',
      trigger,
      attempt,
      duration_ms: Date.now() - startedAt,
    });
    endTrace({ name: TraceName.MoneyMfaSetup, status: 'ok' });
    setStatus('done');
  },
  reset: () => {
    generation += 1;
    failedAttempts = 0;
    status = 'not_started';
    listeners.forEach((listener) => listener());
  },
  clear: async () => {
    generation += 1;
    failedAttempts = 0;
    status = 'not_started';
    listeners.forEach((listener) => listener());
    await StorageWrapper.removeItem(MONEY_ACCOUNT_MIGRATION_STORAGE_KEY);
  },
};
