import Engine from '../../../core/Engine';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
  moneyAccountMigration,
} from './moneyAccountMigration';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountLifecycleController: {
        startMigration: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockSetItem = jest.mocked(StorageWrapper.setItem);
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockStartMigration = jest.mocked(
  Engine.context.MoneyAccountLifecycleController.startMigration,
);

describe('moneyAccountMigration', () => {
  beforeEach(() => {
    mockStartMigration.mockResolvedValue(undefined);
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
});
