import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
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
      MoneyAccountController: {
        state: { moneyAccounts: {} },
        createMoneyAccount: jest.fn(),
        setDefaultMoneyAccount: jest.fn(),
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
const mockMoneyAccountController = jest.mocked(
  Engine.context.MoneyAccountController,
);

describe('moneyAccountMigration', () => {
  beforeEach(() => {
    mockMoneyAccountController.createMoneyAccount.mockResolvedValue({
      id: 'mpc-account',
    } as Awaited<
      ReturnType<typeof mockMoneyAccountController.createMoneyAccount>
    >);
  });

  afterEach(() => {
    moneyAccountMigration.reset();
    jest.clearAllMocks();
    mockMoneyAccountController.state.moneyAccounts = {};
  });

  it('starts as not started', () => {
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
  });

  it('creates the MPC Money account and makes it the default', async () => {
    await moneyAccountMigration.start();

    expect(mockMoneyAccountController.createMoneyAccount).toHaveBeenCalledWith({
      type: KeyringAccountEntropyTypeOption.Mpc,
    });
    expect(
      mockMoneyAccountController.setDefaultMoneyAccount,
    ).toHaveBeenCalledWith('mpc-account');
    expect(moneyAccountMigration.getStatus()).toBe('done');
  });

  it('is migrating while the account is created', async () => {
    let finishCreate: (() => void) | undefined;
    mockMoneyAccountController.createMoneyAccount.mockReturnValueOnce(
      new Promise((resolve) => {
        finishCreate = () =>
          resolve({ id: 'mpc-account' } as Awaited<
            ReturnType<typeof mockMoneyAccountController.createMoneyAccount>
          >);
      }),
    );

    const promise = moneyAccountMigration.start();

    expect(moneyAccountMigration.getStatus()).toBe('migrating');
    finishCreate?.();
    await promise;
    expect(moneyAccountMigration.getStatus()).toBe('done');
  });

  it('fails and rejects when the MPC account cannot be created', async () => {
    const error = new Error('MPC service unavailable');
    mockMoneyAccountController.createMoneyAccount.mockRejectedValueOnce(error);

    await expect(moneyAccountMigration.start()).rejects.toThrow(error);

    expect(moneyAccountMigration.getStatus()).toBe('failed');
    expect(
      mockMoneyAccountController.setDefaultMoneyAccount,
    ).not.toHaveBeenCalled();
  });

  it('keeps the last failure for QA tools', async () => {
    mockMoneyAccountController.createMoneyAccount.mockRejectedValueOnce(
      new Error('MPC service unavailable'),
    );

    await expect(moneyAccountMigration.start()).rejects.toThrow();

    expect(moneyAccountMigration.getLastError()).toMatch(
      /^Error: MPC service unavailable\n {2}at /u,
    );
  });

  it('rejects without saving a result when reset while the account is created', async () => {
    let finishCreate: (account: unknown) => void = () => undefined;
    mockMoneyAccountController.createMoneyAccount.mockReturnValueOnce(
      new Promise((resolve) => {
        finishCreate = resolve as (account: unknown) => void;
      }) as ReturnType<typeof mockMoneyAccountController.createMoneyAccount>,
    );
    const promise = moneyAccountMigration.start();
    moneyAccountMigration.reset();
    mockSetItem.mockClear();

    finishCreate({ id: 'mpc-account' });

    await expect(promise).rejects.toThrow('cancelled');
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(
      mockMoneyAccountController.setDefaultMoneyAccount,
    ).not.toHaveBeenCalled();
  });

  it('reuses an MPC Money account an earlier run created', async () => {
    mockMoneyAccountController.state.moneyAccounts = {
      'mpc-existing': {
        id: 'mpc-existing',
        options: { entropy: { type: KeyringAccountEntropyTypeOption.Mpc } },
      },
    } as unknown as typeof mockMoneyAccountController.state.moneyAccounts;

    await moneyAccountMigration.start();

    expect(
      mockMoneyAccountController.createMoneyAccount,
    ).not.toHaveBeenCalled();
    expect(
      mockMoneyAccountController.setDefaultMoneyAccount,
    ).toHaveBeenCalledWith('mpc-existing');
    expect(moneyAccountMigration.getStatus()).toBe('done');
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
