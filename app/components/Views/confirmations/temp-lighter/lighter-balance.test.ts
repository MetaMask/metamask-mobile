import Engine from '../../../../core/Engine';
import { fetchLighterWithdrawableBalance } from './lighter-balance';

jest.mock('../../../../core/Engine', () => ({
  context: { PerpsController: { getAccountState: jest.fn() } },
}));

const USER = '0x1111111111111111111111111111111111111111';

const getAccountStateMock = jest.mocked(
  Engine.context.PerpsController.getAccountState,
);

function mockAccountState(providerStates: unknown) {
  getAccountStateMock.mockResolvedValue({ providerStates } as never);
}

describe('fetchLighterWithdrawableBalance', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = fetchMock;
  });

  it('returns the withdrawable balance from the controller without calling the API', async () => {
    mockAccountState({
      lighter: {
        status: 'available',
        providerId: 'lighter',
        state: { withdrawableBalance: '5.570887', totalBalance: '9.1' },
      },
    });

    expect(await fetchLighterWithdrawableBalance(USER)).toBe('5.570887');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('fallback to the Lighter API', () => {
    it('is used when the controller has no per-venue states', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [{ available_balance: '5.570887' }],
        }),
      });

      const balance = await fetchLighterWithdrawableBalance(USER);

      expect(balance).toBe('5.570887');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/account?by=l1_address&value=${USER}`),
      );
    });

    it('is used when Lighter is unavailable in the controller', async () => {
      mockAccountState({
        lighter: { status: 'unavailable', providerId: 'lighter' },
      });
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [{ available_balance: '2' }],
        }),
      });

      expect(await fetchLighterWithdrawableBalance(USER)).toBe('2');
    });

    it('is used when the controller read fails', async () => {
      getAccountStateMock.mockRejectedValue(new Error('not initialized'));
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [{ available_balance: '3' }],
        }),
      });

      expect(await fetchLighterWithdrawableBalance(USER)).toBe('3');
    });

    it('returns undefined when the address has no Lighter account', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 21100, message: 'account not found' }),
      });

      expect(await fetchLighterWithdrawableBalance(USER)).toBeUndefined();
    });

    it('returns undefined when the account has no available balance', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [{ available_balance: '' }],
        }),
      });

      expect(await fetchLighterWithdrawableBalance(USER)).toBeUndefined();
    });

    it('throws on any other failure so an outage is not read as an empty balance', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ code: 503, message: 'unavailable' }),
      });

      await expect(fetchLighterWithdrawableBalance(USER)).rejects.toThrow(
        'unavailable',
      );
    });
  });
});
