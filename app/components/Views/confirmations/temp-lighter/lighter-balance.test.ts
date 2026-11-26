import Engine from '../../../../core/Engine';
import {
  fetchLighterTotalBalance,
  fetchLighterWithdrawableBalance,
} from './lighter-balance';

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

    it('throws on a 400 that is not the account not found code', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 20001, message: 'invalid parameter' }),
      });

      await expect(fetchLighterWithdrawableBalance(USER)).rejects.toThrow(
        'invalid parameter',
      );
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

  describe('fetchLighterTotalBalance', () => {
    it('returns the total balance from the controller without calling the API', async () => {
      mockAccountState({
        lighter: {
          status: 'available',
          providerId: 'lighter',
          state: { withdrawableBalance: '5.570887', totalBalance: '9.1' },
        },
      });

      expect(await fetchLighterTotalBalance(USER)).toBe('9.1');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back to the collateral plus the unrealized PnL of the positions', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [
            {
              available_balance: '5.57',
              collateral: '10.25',
              positions: [{ unrealized_pnl: '-0.75' }, { unrealized_pnl: '' }],
            },
          ],
        }),
      });

      expect(await fetchLighterTotalBalance(USER)).toBe('9.5');
    });

    it('falls back to the collateral when the account has no positions', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          accounts: [{ available_balance: '0', collateral: '3' }],
        }),
      });

      expect(await fetchLighterTotalBalance(USER)).toBe('3');
    });

    it('returns undefined when the address has no Lighter account', async () => {
      mockAccountState(undefined);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 21100, message: 'account not found' }),
      });

      expect(await fetchLighterTotalBalance(USER)).toBeUndefined();
    });
  });
});
