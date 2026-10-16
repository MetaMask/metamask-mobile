import { buildBrazilMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { flushPromises } from '../../../../../util/test/utils';
import {
  ensureBrazilMusdAutoramp,
  resetBrazilMusdAutorampSetupGuard,
} from './ensureBrazilMusdAutoramp';

const mockHydrate = jest.fn();
const mockRegister = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      state: {
        autoramps: [] as {
          id: string;
          walletAddress: string;
          status: string;
        }[],
      },
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
      registerMoneyAccountWallet: (...args: unknown[]) => mockRegister(...args),
      createAutoramp: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
}

const setAutoramps = (autoramps: TestAutoramp[]) => {
  (
    Engine.context.RampsController.state as { autoramps: TestAutoramp[] }
  ).autoramps = autoramps;
};

describe('ensureBrazilMusdAutoramp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBrazilMusdAutorampSetupGuard();
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockRegister.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreate.mockResolvedValue({
      id: 'ar-new',
      walletAddress: '0xabc',
      status: 'Created',
    });
  });

  it('waits while the customer is not active, then creates the BRL autoramp once', async () => {
    mockHydrate
      .mockResolvedValueOnce({ autorampStatus: 'not_ready' })
      .mockResolvedValueOnce({ autorampStatus: 'needs_source_currency' });

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('waiting');

    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');

    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      buildBrazilMusdAutorampRequest('0xabc'),
    );
  });

  it('registers the wallet once before creating the autoramp', async () => {
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    const calls: string[] = [];
    mockRegister.mockImplementation(async () => {
      calls.push('register');
      return { type: 'alreadyRegistered' };
    });
    mockCreate.mockImplementation(async () => {
      calls.push('create');
      return { id: 'ar-new', walletAddress: '0xabc', status: 'Created' };
    });

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');

    expect(calls).toEqual(['register', 'create']);
    expect(mockRegister).toHaveBeenCalledWith({ address: '0xabc' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('shares one create across overlapping calls', async () => {
    let releaseCreate: (value: unknown) => void = () => undefined;
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseCreate = resolve;
        }),
    );

    const first = ensureBrazilMusdAutoramp('0xabc');
    const second = ensureBrazilMusdAutoramp('0xabc');
    await flushPromises();

    expect(mockHydrate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    releaseCreate({ id: 'ar-new', walletAddress: '0xabc', status: 'Created' });

    await expect(first).resolves.toBe('ready');
    await expect(second).resolves.toBe('ready');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('creates an autoramp when the only stored routes are rejected or cancelled', async () => {
    setAutoramps([
      { id: 'rejected', walletAddress: '0xabc', status: 'Rejected' },
      { id: 'cancelled', walletAddress: '0xabc', status: 'Cancelled' },
    ]);

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('does not post while a non-terminal autoramp exists', async () => {
    setAutoramps([
      { id: 'ar-1', walletAddress: '0xabc', status: 'Authorized' },
    ]);

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not create an autoramp when wallet lookup is unavailable', async () => {
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    mockRegister.mockResolvedValue({ type: 'lookupUnavailable' });

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('failed');

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
