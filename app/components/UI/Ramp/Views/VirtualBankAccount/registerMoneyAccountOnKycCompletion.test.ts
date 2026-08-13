import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';
import { createRegisterMoneyAccountOnKycCompletion } from './registerMoneyAccountOnKycCompletion';
import { __resetRegisterSelectedMoneyAccountWalletForTests } from './registerSelectedMoneyAccountWallet';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const mockAccountsController = Engine.context.AccountsController as unknown as {
  getSelectedAccount: jest.Mock;
};

const mockRampsController = Engine.context.RampsController as unknown as {
  registerMoneyAccountWallet: jest.Mock<Promise<unknown>, [unknown?]>;
  createAutoramp: jest.Mock<Promise<unknown>, [unknown?]>;
};

const completedEvent = {
  status: 'completed' as const,
  sumsubSessionId: null,
  errorCode: null,
};

const setUp = () => {
  jest.clearAllMocks();
  __resetRegisterSelectedMoneyAccountWalletForTests();
  mockAccountsController.getSelectedAccount.mockReturnValue({
    address: '0xabc',
  });
  mockRampsController.registerMoneyAccountWallet.mockResolvedValue({
    type: 'registered',
    registration: { id: 'reg-1', address: '0xabc', blockchain: 'Monad' },
  });
  mockRampsController.createAutoramp.mockResolvedValue({
    id: 'autoramp-1',
    status: 'created',
  });
  return createRegisterMoneyAccountOnKycCompletion();
};

describe('createRegisterMoneyAccountOnKycCompletion', () => {
  it('ignores non-completed statuses', async () => {
    const handle = setUp();

    await handle({ status: 'pending', sumsubSessionId: null, errorCode: null });

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).not.toHaveBeenCalled();
    expect(mockRampsController.createAutoramp).not.toHaveBeenCalled();
  });

  it('registers the selected account then creates the autoramp on completion', async () => {
    const handle = setUp();

    await handle(completedEvent);

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledWith(
      {
        address: '0xabc',
      },
    );
    expect(mockRampsController.createAutoramp).toHaveBeenCalledWith(
      buildMoneyAccountAutorampParams('0xabc'),
    );
  });

  it('does not re-register or recreate once completed for the same address', async () => {
    const handle = setUp();

    await handle(completedEvent);
    await handle(completedEvent);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(1);
    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(1);
  });

  it('registers only once while a completion is already in flight', async () => {
    const handle = setUp();
    let resolveRegister: (value: unknown) => void = () => undefined;
    mockRampsController.registerMoneyAccountWallet.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );

    const first = handle(completedEvent);
    const second = handle(completedEvent);
    resolveRegister({
      type: 'registered',
      registration: { id: 'reg-1', address: '0xabc', blockchain: 'Monad' },
    });
    await Promise.all([first, second]);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(1);
  });

  it('soft-fails and skips the autoramp when registration rejects', async () => {
    const handle = setUp();
    const registrationError = new Error('registration failed');
    mockRampsController.registerMoneyAccountWallet.mockRejectedValue(
      registrationError,
    );

    await expect(handle(completedEvent)).resolves.toBeUndefined();

    expect(mockRampsController.createAutoramp).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      registrationError,
      expect.objectContaining({
        message: expect.stringContaining('registration'),
      }),
    );
  });

  it('retries registration on a later completion when it rejected', async () => {
    const handle = setUp();
    mockRampsController.registerMoneyAccountWallet
      .mockRejectedValueOnce(new Error('registration failed'))
      .mockResolvedValueOnce({
        type: 'registered',
        registration: { id: 'reg-1', address: '0xabc', blockchain: 'Monad' },
      });

    await handle(completedEvent);
    await handle(completedEvent);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(2);
    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(1);
  });

  it('soft-fails when autoramp creation rejects', async () => {
    const handle = setUp();
    const autorampError = new Error('autoramp failed');
    mockRampsController.createAutoramp.mockRejectedValue(autorampError);

    await expect(handle(completedEvent)).resolves.toBeUndefined();

    expect(Logger.error).toHaveBeenCalledWith(
      autorampError,
      expect.objectContaining({
        message: expect.stringContaining('Autoramp'),
      }),
    );
  });

  it('retries autoramp later without re-signing after an autoramp failure', async () => {
    const handle = setUp();
    mockRampsController.createAutoramp
      .mockRejectedValueOnce(new Error('autoramp failed'))
      .mockResolvedValueOnce({
        id: 'autoramp-2',
        status: 'created',
      });

    await handle(completedEvent);
    await handle(completedEvent);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(1);
    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(2);
  });

  it('logs and skips when no account is selected', async () => {
    const handle = setUp();
    mockAccountsController.getSelectedAccount.mockReturnValue(undefined);

    await handle(completedEvent);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalled();
  });
});
