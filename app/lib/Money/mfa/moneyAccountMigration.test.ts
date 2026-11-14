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

const mockSetItem = jest.mocked(StorageWrapper.setItem);
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);

describe('moneyAccountMigration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    moneyAccountMigration.reset();
    jest.clearAllMocks();
  });

  it('starts as not started', () => {
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
  });

  it('is migrating while it runs, then done', async () => {
    const promise = moneyAccountMigration.start();

    expect(moneyAccountMigration.getStatus()).toBe('migrating');

    jest.runAllTimers();
    await promise;

    expect(moneyAccountMigration.getStatus()).toBe('done');
  });

  it('fails and rejects when the migration throws', async () => {
    const error = new Error('timer unavailable');
    jest.spyOn(global, 'setTimeout').mockImplementationOnce(() => {
      throw error;
    });

    await expect(moneyAccountMigration.start()).rejects.toThrow(error);

    expect(moneyAccountMigration.getStatus()).toBe('failed');
  });

  it('rejects without saving a result when reset while running', async () => {
    const promise = moneyAccountMigration.start();
    moneyAccountMigration.reset();
    mockSetItem.mockClear();

    jest.runAllTimers();

    await expect(promise).rejects.toThrow('cancelled');
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('saves each status and notifies subscribers', async () => {
    const listener = jest.fn();
    moneyAccountMigration.subscribe(listener);

    const promise = moneyAccountMigration.start();
    jest.runAllTimers();
    await promise;

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
