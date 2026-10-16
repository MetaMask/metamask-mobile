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
      state: { autoramps: [] as { walletAddress: string; status: string }[] },
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
      registerMoneyAccountWallet: (...args: unknown[]) => mockRegister(...args),
      createAutoramp: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const setAutoramps = (
  autoramps: { id?: string; walletAddress: string; status: string }[],
) => {
  (
    Engine.context.RampsController.state as {
      autoramps: typeof autoramps;
    }
  ).autoramps = autoramps;
};

describe('ensureBrazilMusdAutoramp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBrazilMusdAutorampSetupGuard();
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockRegister.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreate.mockResolvedValue({ id: 'ar-new', status: 'Created' });
  });

  it('waits while inactive, then registers and creates once', async () => {
    mockHydrate
      .mockResolvedValueOnce({ autorampStatus: 'not_ready' })
      .mockResolvedValueOnce({
        autorampStatus: 'needs_wallet_registration',
      });

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('waiting');
    expect(mockCreate).not.toHaveBeenCalled();

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');
    expect(mockRegister).toHaveBeenCalledWith({ address: '0xabc' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      buildBrazilMusdAutorampRequest('0xabc'),
    );
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
    releaseCreate({ id: 'ar-new', status: 'Created' });
    await expect(Promise.all([first, second])).resolves.toEqual([
      'ready',
      'ready',
    ]);
  });

  it('skips create when a usable autoramp exists', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'Authorized' }]);

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates when only rejected or cancelled routes exist', async () => {
    setAutoramps([
      { walletAddress: '0xabc', status: 'Rejected' },
      { walletAddress: '0xabc', status: 'Cancelled' },
    ]);

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('ready');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('fails without creating when wallet lookup is unavailable', async () => {
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    mockRegister.mockResolvedValue({ type: 'lookupUnavailable' });

    await expect(ensureBrazilMusdAutoramp('0xabc')).resolves.toBe('failed');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
