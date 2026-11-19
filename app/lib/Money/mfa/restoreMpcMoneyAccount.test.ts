import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { restoreMpcMoneyAccount } from './restoreMpcMoneyAccount';

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountController: {
        createMoneyAccount: jest.fn(),
        setDefaultMoneyAccount: jest.fn(),
      },
      MoneyAccountLifecycleController: {
        refresh: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockCreateMoneyAccount = jest.mocked(
  Engine.context.MoneyAccountController.createMoneyAccount,
);
const mockSetDefault = jest.mocked(
  Engine.context.MoneyAccountController.setDefaultMoneyAccount,
);
const mockRefresh = jest.mocked(
  Engine.context.MoneyAccountLifecycleController.refresh,
);

const MPC_ADDRESS = '0xAbC0000000000000000000000000000000000001';
const MPC_ID = 'mpc-account-id';

const restoredAccount = (address: string) =>
  ({ id: MPC_ID, address }) as Awaited<
    ReturnType<typeof mockCreateMoneyAccount>
  >;

describe('restoreMpcMoneyAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
  });

  it('creates the MPC Money account, makes it the default and refreshes the lifecycle when the address matches', async () => {
    mockCreateMoneyAccount.mockResolvedValue(restoredAccount(MPC_ADDRESS));

    await restoreMpcMoneyAccount(MPC_ADDRESS.toLowerCase());

    expect(mockCreateMoneyAccount).toHaveBeenCalledWith({ type: 'mpc' });
    expect(mockSetDefault).toHaveBeenCalledWith(MPC_ID);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('resolves without waiting for the lifecycle refresh', async () => {
    mockCreateMoneyAccount.mockResolvedValue(restoredAccount(MPC_ADDRESS));
    mockRefresh.mockReturnValue(new Promise<void>(() => undefined));

    await expect(restoreMpcMoneyAccount(MPC_ADDRESS)).resolves.toBeUndefined();

    expect(mockSetDefault).toHaveBeenCalledWith(MPC_ID);
  });

  it('logs a failed lifecycle refresh without rejecting', async () => {
    const error = new Error('refresh failed');
    mockCreateMoneyAccount.mockResolvedValue(restoredAccount(MPC_ADDRESS));
    mockRefresh.mockRejectedValue(error);

    await restoreMpcMoneyAccount(MPC_ADDRESS);
    await Promise.resolve();

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Money account lifecycle refresh failed after restore',
    );
  });

  it('throws without defaulting or refreshing when the restored address does not match', async () => {
    mockCreateMoneyAccount.mockResolvedValue(
      restoredAccount('0x0000000000000000000000000000000000000002'),
    );

    await expect(restoreMpcMoneyAccount(MPC_ADDRESS)).rejects.toThrow(
      `does not match ${MPC_ADDRESS}`,
    );

    expect(mockSetDefault).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
