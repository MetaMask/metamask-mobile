import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { flushPromises } from '../../../../../util/test/utils';
import {
  ensureMusdAutoramp,
  resetMusdAutorampSetupGuard,
} from './ensureMusdAutoramp';

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

describe('ensureMusdAutoramp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMusdAutorampSetupGuard();
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

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('waiting');
    expect(mockCreate).not.toHaveBeenCalled();

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('ready');
    expect(mockRegister).toHaveBeenCalledWith({ address: '0xabc' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      buildMusdAutorampRequest('0xabc', 'BRL'),
    );
  });

  it.each(['USD', 'EUR'] as const)(
    'creates the autoramp in %s',
    async (currency) => {
      await expect(ensureMusdAutoramp('0xabc', currency)).resolves.toBe(
        'ready',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: currency }],
        }),
      );
    },
  );

  it('shares one create across overlapping calls', async () => {
    let releaseCreate: (value: unknown) => void = () => undefined;
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseCreate = resolve;
        }),
    );

    const first = ensureMusdAutoramp('0xabc', 'BRL');
    const second = ensureMusdAutoramp('0xABC', 'BRL');
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

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('ready');
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not replace rejected or cancelled routes on its own', async () => {
    setAutoramps([
      { walletAddress: '0xabc', status: 'Rejected' },
      { walletAddress: '0xabc', status: 'Cancelled' },
    ]);

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('terminal');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('replaces a rejected route when asked to', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'Rejected' }]);

    await expect(
      ensureMusdAutoramp('0xabc', 'BRL', { replaceTerminal: true }),
    ).resolves.toBe('ready');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('fails without creating when wallet lookup is unavailable', async () => {
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    mockRegister.mockResolvedValue({ type: 'lookupUnavailable' });

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('failed');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('fails when create throws', async () => {
    mockCreate.mockRejectedValue(new Error('create failed'));

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('failed');
  });
});
