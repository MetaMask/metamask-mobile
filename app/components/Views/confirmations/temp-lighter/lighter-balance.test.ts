import { fetchLighterWithdrawableBalance } from './lighter-balance';

const USER = '0x1111111111111111111111111111111111111111';

describe('fetchLighterWithdrawableBalance', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = fetchMock;
  });

  it('returns the available balance of the account', async () => {
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

  it('returns undefined when the address has no Lighter account', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 21100, message: 'account not found' }),
    });

    expect(await fetchLighterWithdrawableBalance(USER)).toBeUndefined();
  });

  it('returns undefined when the account has no available balance', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, accounts: [{ available_balance: '' }] }),
    });

    expect(await fetchLighterWithdrawableBalance(USER)).toBeUndefined();
  });

  it('throws on any other failure so an outage is not read as an empty balance', async () => {
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
