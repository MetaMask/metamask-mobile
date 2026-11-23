import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  MIGRATION_POLL_INTERVAL_MS,
  MIGRATION_POLL_TIMEOUT_MS,
  MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
  moneyAccountMigration,
} from './moneyAccountMigration';
import Logger from '../../../util/Logger';
import { trackMoneyMfaSetupStatus } from '../../../util/analytics/moneyMfaTracking';
import { endTrace, TraceName } from '../../../util/trace';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(async () => Promise.resolve()),
  },
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountLifecycleController: {
        startMigration: jest.fn(),
        refresh: jest.fn(),
        state: { moneyAccounts: {} },
      },
    },
  },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../../util/analytics/moneyMfaTracking', () => ({
  ...jest.requireActual('../../../util/analytics/moneyMfaTracking'),
  trackMoneyMfaSetupStatus: jest.fn(),
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn((_request: unknown, fn?: () => unknown) =>
    fn ? fn() : { name: 'parent' },
  ),
  endTrace: jest.fn(),
}));

const mockTrackStatus = jest.mocked(trackMoneyMfaSetupStatus);
const mockEndTrace = jest.mocked(endTrace);
const mockLoggerError = jest.mocked(Logger.error);

const upgradeStepError = (step: string, terminal = false) =>
  Object.assign(new Error(`Money Account upgrade failed at step "${step}"`), {
    name: 'MoneyAccountUpgradeStepError',
    step,
    terminal,
    cause: Object.assign(new Error('unauthorized'), { name: 'HttpError' }),
  });

const mockSetItem = jest.mocked(StorageWrapper.setItem);
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockStartMigration = jest.mocked(
  Engine.context.MoneyAccountLifecycleController.startMigration,
);
const mockRefresh = jest.mocked(
  Engine.context.MoneyAccountLifecycleController.refresh,
);
const lifecycleState = Engine.context.MoneyAccountLifecycleController.state as {
  moneyAccounts: Record<string, { type: string }>;
};
const setMoneyAccountType = (type: string) => {
  lifecycleState.moneyAccounts = { '0xabc': { type } };
};

describe('moneyAccountMigration', () => {
  beforeEach(() => {
    mockStartMigration.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
    setMoneyAccountType('mfa');
  });

  afterEach(() => {
    moneyAccountMigration.reset();
    jest.clearAllMocks();
  });

  it('starts as not started', () => {
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
  });

  it('starts the Money account migration in the lifecycle controller', async () => {
    await moneyAccountMigration.start();

    expect(mockStartMigration).toHaveBeenCalledTimes(1);
    expect(moneyAccountMigration.getStatus()).toBe('done');
  });

  it('is migrating while the lifecycle controller migrates', async () => {
    let finish: () => void = () => undefined;
    mockStartMigration.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const promise = moneyAccountMigration.start();

    expect(moneyAccountMigration.getStatus()).toBe('migrating');
    finish();
    await promise;
    expect(moneyAccountMigration.getStatus()).toBe('done');
  });

  it('fails and rejects when the migration fails', async () => {
    const error = new Error('Money Account migration is not available');
    mockStartMigration.mockRejectedValueOnce(error);

    await expect(moneyAccountMigration.start()).rejects.toThrow(error);

    expect(moneyAccountMigration.getStatus()).toBe('failed');
  });

  it('keeps the last failure for QA tools', async () => {
    mockStartMigration.mockRejectedValueOnce(
      new Error('MPC service unavailable'),
    );

    await expect(moneyAccountMigration.start()).rejects.toThrow();

    expect(moneyAccountMigration.getLastError()).toMatch(
      /^Error: MPC service unavailable\n {2}at /u,
    );
  });

  it('rejects without saving a result when reset during the migration', async () => {
    let finish: () => void = () => undefined;
    mockStartMigration.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const promise = moneyAccountMigration.start();
    moneyAccountMigration.reset();
    mockSetItem.mockClear();

    finish();

    await expect(promise).rejects.toThrow('cancelled');
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('saves each status and notifies subscribers', async () => {
    const listener = jest.fn();
    moneyAccountMigration.subscribe(listener);

    await moneyAccountMigration.start();

    expect(mockSetItem).toHaveBeenCalledWith(
      MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
      'migrating',
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
      'done',
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it.each(['migrating', 'done', 'failed'] as const)(
    'reads a saved %s status at startup',
    (saved) => {
      mockGetItemSync.mockReturnValueOnce(saved);

      jest.isolateModules(() => {
        const { moneyAccountMigration: fresh } = jest.requireActual<
          typeof import('./moneyAccountMigration')
        >('./moneyAccountMigration');

        expect(fresh.getStatus()).toBe(saved);
      });
    },
  );

  it('ignores an unknown saved status', () => {
    mockGetItemSync.mockReturnValueOnce('paused');

    jest.isolateModules(() => {
      const { moneyAccountMigration: fresh } = jest.requireActual<
        typeof import('./moneyAccountMigration')
      >('./moneyAccountMigration');

      expect(fresh.getStatus()).toBe('not_started');
    });
  });

  it('refreshes until the Money account is no longer migrating', async () => {
    jest.useFakeTimers();
    setMoneyAccountType('migrating');
    mockRefresh
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => {
        setMoneyAccountType('mfa');
      });

    const run = moneyAccountMigration.start();
    await jest.advanceTimersByTimeAsync(MIGRATION_POLL_INTERVAL_MS);
    await run;

    expect(mockRefresh).toHaveBeenCalledTimes(2);
    expect(moneyAccountMigration.getStatus()).toBe('done');
    jest.useRealTimers();
  });

  it('fails when the Money account is still migrating after the timeout', async () => {
    jest.useFakeTimers();
    setMoneyAccountType('migrating');

    const result = moneyAccountMigration.start().catch((error: Error) => error);
    await jest.advanceTimersByTimeAsync(
      MIGRATION_POLL_TIMEOUT_MS + MIGRATION_POLL_INTERVAL_MS,
    );

    expect((await result) as Error).toHaveProperty(
      'message',
      'Money account migration did not finish in time',
    );

    expect(moneyAccountMigration.getStatus()).toBe('failed');
    jest.useRealTimers();
  });

  describe('tracking', () => {
    it('tracks started and completed with the trigger and attempt', async () => {
      await moneyAccountMigration.start('retry');

      expect(mockTrackStatus).toHaveBeenNthCalledWith(1, {
        status: 'started',
        trigger: 'retry',
        attempt: 1,
      });
      expect(mockTrackStatus).toHaveBeenNthCalledWith(2, {
        status: 'completed',
        trigger: 'retry',
        attempt: 1,
        duration_ms: expect.any(Number),
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MoneyMfaSetup,
        status: 'ok',
      });
    });

    it('tracks the upgrade step that failed and counts the next attempt', async () => {
      mockStartMigration.mockRejectedValueOnce(
        upgradeStepError('associate-address'),
      );

      await moneyAccountMigration.start().catch(() => undefined);
      await moneyAccountMigration.start('retry');

      expect(mockTrackStatus).toHaveBeenCalledWith({
        status: 'failed',
        trigger: 'turn_on',
        attempt: 1,
        duration_ms: expect.any(Number),
        failed_step: 'associate_address',
        error_name: 'HttpError',
        is_terminal: false,
      });
      expect(mockTrackStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'completed', attempt: 2 }),
      );
    });

    it('reports the failed step and trigger to Sentry', async () => {
      mockStartMigration.mockRejectedValueOnce(
        upgradeStepError('register-intents', true),
      );

      await moneyAccountMigration.start().catch(() => undefined);

      expect(mockLoggerError).toHaveBeenCalledWith(expect.any(Error), {
        tags: {
          feature: 'money-mfa',
          money_mfa_failed_step: 'register_intents',
          money_mfa_trigger: 'turn_on',
        },
        context: {
          name: 'money_mfa_setup',
          data: expect.objectContaining({
            attempt: 1,
            is_terminal: true,
            error_name: 'HttpError',
          }),
        },
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MoneyMfaSetup,
        status: 'error',
        data: { failed_step: 'register_intents' },
      });
    });

    it('tracks start_migration when the failure names no upgrade step', async () => {
      mockStartMigration.mockRejectedValueOnce(new Error('boom'));

      await moneyAccountMigration.start().catch(() => undefined);

      expect(mockTrackStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'failed',
          failed_step: 'start_migration',
          error_name: 'Error',
        }),
      );
    });

    it('tracks funds_transfer_status when refreshing the migration fails', async () => {
      mockRefresh.mockRejectedValueOnce(new Error('network'));

      await moneyAccountMigration.start().catch(() => undefined);

      expect(mockTrackStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({ failed_step: 'funds_transfer_status' }),
      );
    });

    it('tracks funds_transfer_timeout when the transfer outlives the timeout', async () => {
      jest.useFakeTimers();
      setMoneyAccountType('migrating');

      const run = moneyAccountMigration.start().catch(() => undefined);
      await jest.advanceTimersByTimeAsync(
        MIGRATION_POLL_TIMEOUT_MS + MIGRATION_POLL_INTERVAL_MS,
      );
      await run;

      expect(mockTrackStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          failed_step: 'funds_transfer_timeout',
          error_name: 'MigrationTimeoutError',
        }),
      );
      jest.useRealTimers();
    });

    it('tracks no result when a reset cancels the migration', async () => {
      let finish: () => void = () => undefined;
      mockStartMigration.mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );

      const run = moneyAccountMigration.start().catch(() => undefined);
      moneyAccountMigration.reset();
      finish();
      await run;

      expect(mockTrackStatus).toHaveBeenCalledTimes(1);
      expect(mockTrackStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'started' }),
      );
    });
  });
});
