import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { flushPromises } from '../../../../../util/test/utils';
import {
  ensureMusdAutoramp,
  findUsableAutoramp,
  resetMusdAutorampSetupGuard,
} from './ensureMusdAutoramp';
import { TraceName } from '../../../../../util/trace';
import { endVbaCufChildTrace, startVbaCufChildTrace } from './vbaCufTrace';

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
jest.mock('./vbaCufTrace', () => ({
  startVbaCufChildTrace: jest.fn(() => 'autoramp-setup-id'),
  endVbaCufChildTrace: jest.fn(),
}));

const mockStartVbaCufChildTrace = jest.mocked(startVbaCufChildTrace);
const mockEndVbaCufChildTrace = jest.mocked(endVbaCufChildTrace);

const setAutoramps = (
  autoramps: {
    id?: string;
    walletAddress: string;
    status: string;
    depositRailsSummary?: { currency?: string };
  }[],
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

  it('waits for MoonPay after KYC, then registers and creates once', async () => {
    mockHydrate
      .mockResolvedValueOnce({
        autorampStatus: 'not_ready',
        kycStatus: 'approved',
      })
      .mockResolvedValueOnce({
        autorampStatus: 'needs_wallet_registration',
        kycStatus: 'approved',
      });

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe(
      'awaiting_provider',
    );
    expect(mockStartVbaCufChildTrace).toHaveBeenCalledWith(
      TraceName.VbaAutorampSetup,
    );
    expect(mockEndVbaCufChildTrace).toHaveBeenCalledWith(
      'autoramp-setup-id',
      true,
      undefined,
    );
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

  it('creates the requested fiat when the usable autoramp is a different currency', async () => {
    setAutoramps([
      {
        walletAddress: '0xabc',
        status: 'Approved',
        depositRailsSummary: { currency: 'BRL' },
      },
    ]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'ready' });

    await expect(ensureMusdAutoramp('0xabc', 'USD')).resolves.toBe('ready');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'USD' }],
      }),
    );
  });

  it('does not create again when the usable autoramp has no currency yet', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'Created' }]);

    await expect(ensureMusdAutoramp('0xabc', 'USD')).resolves.toBe('ready');

    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('uses an exact currency match ahead of an earlier unlabeled autoramp', async () => {
    const autoramps = [
      { walletAddress: '0xabc', status: 'Approved' },
      {
        walletAddress: '0xabc',
        status: 'Approved',
        depositRailsSummary: { currency: 'USD' },
      },
    ];

    expect(findUsableAutoramp(autoramps, '0xabc', 'USD')).toBe(autoramps[1]);
  });

  it.each(['RegistrationFailed', 'AuthorizationFailed'] as const)(
    'does not treat an existing %s autoramp as usable',
    async (status) => {
      setAutoramps([
        {
          walletAddress: '0xabc',
          status,
          depositRailsSummary: { currency: 'BRL' },
        },
      ]);

      await expect(ensureMusdAutoramp('0xabc', 'BRL')).rejects.toEqual(
        expect.objectContaining({
          result: { kind: 'fiat', status },
        }),
      );
      expect(mockHydrate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );

  it('does not let a failed autoramp with no currency block another fiat', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'RegistrationFailed' }]);

    await expect(ensureMusdAutoramp('0xabc', 'USD')).resolves.toBe('ready');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'USD' }],
      }),
    );
  });

  it('does not treat a rejected BRL autoramp as terminal for a USD request', async () => {
    setAutoramps([
      {
        walletAddress: '0xabc',
        status: 'Rejected',
        depositRailsSummary: { currency: 'BRL' },
      },
    ]);

    await expect(ensureMusdAutoramp('0xabc', 'USD')).resolves.toBe('ready');

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('does not replace rejected or cancelled routes on its own', async () => {
    setAutoramps([
      {
        walletAddress: '0xabc',
        status: 'Rejected',
        depositRailsSummary: { currency: 'BRL' },
      },
      {
        walletAddress: '0xabc',
        status: 'Cancelled',
        depositRailsSummary: { currency: 'BRL' },
      },
    ]);

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).resolves.toBe('terminal');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not let a rejected autoramp with no currency block another fiat', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'Rejected' }]);

    await expect(ensureMusdAutoramp('0xabc', 'USD')).resolves.toBe('ready');

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('replaces a rejected route when asked to', async () => {
    setAutoramps([{ walletAddress: '0xabc', status: 'Rejected' }]);

    await expect(
      ensureMusdAutoramp('0xabc', 'BRL', { replaceTerminal: true }),
    ).resolves.toBe('ready');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('surfaces an account-creation error when wallet lookup is unavailable', async () => {
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    mockRegister.mockResolvedValue({ type: 'lookupUnavailable' });

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).rejects.toEqual(
      expect.objectContaining({
        result: { kind: 'unknown' },
      }),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('surfaces an account-creation error when create throws', async () => {
    mockCreate.mockRejectedValue(new Error('create failed'));

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).rejects.toEqual(
      expect.objectContaining({
        result: { kind: 'unknown' },
      }),
    );
  });

  it('preserves an HTTP 500 account-creation error', async () => {
    mockCreate.mockRejectedValue({ httpStatus: 500 });

    await expect(ensureMusdAutoramp('0xabc', 'BRL')).rejects.toEqual(
      expect.objectContaining({
        result: { kind: 'http', status: 500 },
      }),
    );
  });

  it.each(['RegistrationFailed', 'AuthorizationFailed'] as const)(
    'surfaces the %s fiat status returned by account creation',
    async (status) => {
      mockCreate.mockResolvedValue({ id: 'ar-new', status });

      await expect(ensureMusdAutoramp('0xabc', 'BRL')).rejects.toEqual(
        expect.objectContaining({
          result: { kind: 'fiat', status },
        }),
      );
    },
  );
});
