import Engine from '../../../../../core/Engine';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';
import {
  ensureMoneyAccountAutorampCreated,
  ensureMoneyAccountWalletRegistered,
  resetMoneyAccountProvisioning,
} from './moneyAccountProvisioning';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
    },
  },
}));

const mockRampsController = Engine.context.RampsController as unknown as {
  registerMoneyAccountWallet: jest.Mock<Promise<unknown>, [unknown?]>;
  createAutoramp: jest.Mock<Promise<unknown>, [unknown?]>;
};

const setUp = () => {
  jest.clearAllMocks();
  resetMoneyAccountProvisioning();
  mockRampsController.registerMoneyAccountWallet.mockResolvedValue({
    type: 'registered',
  });
  mockRampsController.createAutoramp.mockResolvedValue({
    id: 'autoramp-1',
    status: 'created',
  });
};

describe('ensureMoneyAccountWalletRegistered', () => {
  it('registers the wallet and returns the result', async () => {
    setUp();

    const result = await ensureMoneyAccountWalletRegistered('0xabc');

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledWith({
      address: '0xabc',
    });
    expect(result).toStrictEqual({ type: 'registered' });
  });

  it('registers once for repeated calls with the same address', async () => {
    setUp();

    await ensureMoneyAccountWalletRegistered('0xabc');
    await ensureMoneyAccountWalletRegistered('0xabc');

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      1,
    );
  });

  it('treats addresses that differ only in casing as the same wallet', async () => {
    setUp();

    await ensureMoneyAccountWalletRegistered('0xABC');
    await ensureMoneyAccountWalletRegistered('0xabc');

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      1,
    );
  });

  it('collapses concurrent callers onto one registration', async () => {
    setUp();
    let resolveRegister: (value: unknown) => void = () => undefined;
    mockRampsController.registerMoneyAccountWallet.mockReturnValue(
      new Promise((resolve) => {
        resolveRegister = resolve;
      }),
    );

    const first = ensureMoneyAccountWalletRegistered('0xabc');
    const second = ensureMoneyAccountWalletRegistered('0xabc');
    resolveRegister({ type: 'registered' });

    await expect(Promise.all([first, second])).resolves.toStrictEqual([
      { type: 'registered' },
      { type: 'registered' },
    ]);
    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      1,
    );
  });

  it('registers each address separately', async () => {
    setUp();

    await ensureMoneyAccountWalletRegistered('0xabc');
    await ensureMoneyAccountWalletRegistered('0xdef');

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      2,
    );
  });

  it('retries after a rejected registration', async () => {
    setUp();
    mockRampsController.registerMoneyAccountWallet
      .mockRejectedValueOnce(new Error('signing rejected'))
      .mockResolvedValueOnce({ type: 'registered' });

    await expect(ensureMoneyAccountWalletRegistered('0xabc')).rejects.toThrow(
      'signing rejected',
    );

    await expect(
      ensureMoneyAccountWalletRegistered('0xabc'),
    ).resolves.toStrictEqual({ type: 'registered' });
  });
});

describe('ensureMoneyAccountAutorampCreated', () => {
  it('creates the demo autoramp for the address', async () => {
    setUp();

    const account = await ensureMoneyAccountAutorampCreated('0xabc');

    expect(mockRampsController.createAutoramp).toHaveBeenCalledWith(
      buildMoneyAccountAutorampParams('0xabc'),
    );
    expect(account).toStrictEqual({ id: 'autoramp-1', status: 'created' });
  });

  it('returns the same autoramp instead of creating a second one', async () => {
    setUp();

    const first = await ensureMoneyAccountAutorampCreated('0xabc');
    const second = await ensureMoneyAccountAutorampCreated('0xabc');

    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('retries after a rejected creation', async () => {
    setUp();
    mockRampsController.createAutoramp
      .mockRejectedValueOnce(new Error('customer is not active'))
      .mockResolvedValueOnce({ id: 'autoramp-2', status: 'created' });

    await expect(ensureMoneyAccountAutorampCreated('0xabc')).rejects.toThrow(
      'customer is not active',
    );

    await expect(
      ensureMoneyAccountAutorampCreated('0xabc'),
    ).resolves.toStrictEqual({ id: 'autoramp-2', status: 'created' });
  });
});

describe('resetMoneyAccountProvisioning', () => {
  it('lets the same wallet be provisioned again', async () => {
    setUp();
    await ensureMoneyAccountWalletRegistered('0xabc');
    await ensureMoneyAccountAutorampCreated('0xabc');

    resetMoneyAccountProvisioning();
    await ensureMoneyAccountWalletRegistered('0xabc');
    await ensureMoneyAccountAutorampCreated('0xabc');

    expect(mockRampsController.registerMoneyAccountWallet).toHaveBeenCalledTimes(
      2,
    );
    expect(mockRampsController.createAutoramp).toHaveBeenCalledTimes(2);
  });
});
