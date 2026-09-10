import { renderHook, waitFor, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import type { ReferralMeDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useRewardsMoneyMe } from './useRewardsMoneyMe';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { controllerMessenger: { call: jest.fn() } },
}));

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  REWARDS_MONEY_ENABLED: true,
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);

const createMe = (overrides: Partial<ReferralMeDto> = {}): ReferralMeDto => ({
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: null,
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 2500,
    cashback_rate_bps: 50,
    earning_term_days: 90,
  },
  ...overrides,
});

describe('useRewardsMoneyMe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the bootstrap payload on mount', async () => {
    const me = createMe();
    mockCall.mockResolvedValue(me as never);

    const { result } = renderHook(() => useRewardsMoneyMe());

    await waitFor(() => expect(result.current.me).toStrictEqual(me));
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:getReferralMe',
      { forceFresh: false },
    );
  });

  it('clears the loading flag once the payload arrives', async () => {
    mockCall.mockResolvedValue(createMe() as never);

    const { result } = renderHook(() => useRewardsMoneyMe());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('surfaces the failure message when the read rejects', async () => {
    mockCall.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useRewardsMoneyMe());

    await waitFor(() => expect(result.current.error).toBe('Network down'));
    expect(result.current.me).toBeNull();
  });

  it('refetches with forceFresh when refresh is called', async () => {
    mockCall.mockResolvedValue(createMe() as never);
    const { result } = renderHook(() => useRewardsMoneyMe());
    await waitFor(() => expect(result.current.me).not.toBeNull());

    await act(async () => {
      result.current.refresh();
    });

    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsMoneyController:getReferralMe',
      { forceFresh: true },
    );
  });

  it('falls back to a generic message when the rejection is not an Error', async () => {
    mockCall.mockRejectedValue('socket closed');

    const { result } = renderHook(() => useRewardsMoneyMe());

    await waitFor(() => expect(result.current.error).toBe('Failed to load'));
  });

  it('does not set state after the screen has unmounted', async () => {
    let release: (value: unknown) => void = () => undefined;
    mockCall.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );
    const { result, unmount } = renderHook(() => useRewardsMoneyMe());

    unmount();
    await act(async () => {
      release(createMe());
    });

    expect(result.current.me).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('clears a previous error on a successful refresh', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useRewardsMoneyMe());
    await waitFor(() => expect(result.current.error).toBe('Network down'));
    mockCall.mockResolvedValue(createMe() as never);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
