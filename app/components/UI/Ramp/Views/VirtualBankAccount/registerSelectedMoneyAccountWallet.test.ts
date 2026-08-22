import Engine from '../../../../../core/Engine';
import {
  __resetRegisterSelectedMoneyAccountWalletForTests,
  MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN,
  registerSelectedMoneyAccountWallet,
} from './registerSelectedMoneyAccountWallet';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
    },
  },
}));

const mockAccountsController = Engine.context.AccountsController as unknown as {
  getSelectedAccount: jest.Mock;
};

const mockRampsController = Engine.context.RampsController as unknown as {
  registerMoneyAccountWallet: jest.Mock<Promise<unknown>, [unknown?]>;
};

describe('registerSelectedMoneyAccountWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRegisterSelectedMoneyAccountWalletForTests();
    mockAccountsController.getSelectedAccount.mockReturnValue({
      address: '0xabc',
    });
    mockRampsController.registerMoneyAccountWallet.mockResolvedValue({
      type: 'registered',
      registration: { id: 'reg-1', address: '0xabc', blockchain: 'Monad' },
    });
  });

  it('registers the selected account through RampsController', async () => {
    const result = await registerSelectedMoneyAccountWallet({
      source: 'pipeline',
    });

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledWith(
      {
        address: '0xabc',
      },
    );
    expect(result).toEqual({
      address: '0xabc',
      registrationChain: MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN,
      resultType: 'registered',
      reused: false,
      registrationId: 'reg-1',
    });
  });

  it('reuses a completed session result without signing again', async () => {
    await registerSelectedMoneyAccountWallet({ source: 'kycCompletion' });
    const second = await registerSelectedMoneyAccountWallet({
      source: 'pipeline',
      address: '0xABC',
    });

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(1);
    expect(second.reused).toBe(true);
    expect(second.resultType).toBe('registered');
  });

  it('joins an in-flight registration for the same address', async () => {
    let resolveRegister: (value: unknown) => void = () => undefined;
    mockRampsController.registerMoneyAccountWallet.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );

    const first = registerSelectedMoneyAccountWallet({
      source: 'kycCompletion',
    });
    const second = registerSelectedMoneyAccountWallet({ source: 'pipeline' });
    resolveRegister({
      type: 'alreadyRegistered',
      registration: {
        id: 'reg-2',
        address: '0xabc',
        blockchain: 'Monad',
      },
    });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(1);
    expect(firstResult.reused).toBe(false);
    expect(secondResult.reused).toBe(true);
    expect(secondResult.resultType).toBe('alreadyRegistered');
  });

  it('retries after a rejected registration', async () => {
    mockRampsController.registerMoneyAccountWallet
      .mockRejectedValueOnce(new Error('user rejected'))
      .mockResolvedValueOnce({
        type: 'registered',
        registration: { id: 'reg-3', address: '0xabc', blockchain: 'Monad' },
      });

    await expect(
      registerSelectedMoneyAccountWallet({ source: 'pipeline' }),
    ).rejects.toThrow('user rejected');

    const result = await registerSelectedMoneyAccountWallet({
      source: 'pipeline',
    });

    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).toHaveBeenCalledTimes(2);
    expect(result.reused).toBe(false);
    expect(result.registrationId).toBe('reg-3');
  });

  it('throws when no account is selected and no address override is given', async () => {
    mockAccountsController.getSelectedAccount.mockReturnValue(undefined);

    await expect(
      registerSelectedMoneyAccountWallet({ source: 'pipeline' }),
    ).rejects.toThrow('No wallet address is selected.');
    expect(
      mockRampsController.registerMoneyAccountWallet,
    ).not.toHaveBeenCalled();
  });
});
