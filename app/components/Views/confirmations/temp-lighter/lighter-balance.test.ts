import Engine from '../../../../core/Engine';
import { fetchLighterWithdrawableBalance } from './lighter-balance';

jest.mock('../../../../core/Engine', () => ({
  context: { PerpsController: { getAccountState: jest.fn() } },
}));

const getAccountStateMock = jest.mocked(
  Engine.context.PerpsController.getAccountState,
);

function mockAccountState(providerStates: unknown) {
  getAccountStateMock.mockResolvedValue({ providerStates } as never);
}

describe('fetchLighterWithdrawableBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the withdrawable balance of the Lighter account', async () => {
    mockAccountState({
      lighter: {
        status: 'available',
        providerId: 'lighter',
        state: { withdrawableBalance: '5.570887', totalBalance: '9.1' },
      },
    });

    expect(await fetchLighterWithdrawableBalance()).toBe('5.570887');
  });

  it('returns undefined when Lighter is unavailable', async () => {
    mockAccountState({
      lighter: { status: 'unavailable', providerId: 'lighter' },
    });

    expect(await fetchLighterWithdrawableBalance()).toBeUndefined();
  });

  it('returns undefined when Lighter has not reported yet', async () => {
    mockAccountState({ lighter: { status: 'pending', providerId: 'lighter' } });

    expect(await fetchLighterWithdrawableBalance()).toBeUndefined();
  });

  it('returns undefined when the account state has no per-venue states', async () => {
    mockAccountState(undefined);

    expect(await fetchLighterWithdrawableBalance()).toBeUndefined();
  });

  it('throws when the lookup fails so an outage is not read as an empty balance', async () => {
    getAccountStateMock.mockRejectedValue(new Error('unavailable'));

    await expect(fetchLighterWithdrawableBalance()).rejects.toThrow(
      'unavailable',
    );
  });
});
