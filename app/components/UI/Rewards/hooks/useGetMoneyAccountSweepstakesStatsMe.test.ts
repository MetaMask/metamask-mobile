import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetMoneyAccountSweepstakesStatsMe } from './useGetMoneyAccountSweepstakesStatsMe';
import {
  setMoneyAccountSweepstakesStats,
  setMoneyAccountSweepstakesStatsLoading,
  setMoneyAccountSweepstakesStatsError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { RootState } from '../../../../reducers';
import type { MoneyAccountSweepstakesStatsMeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockUseSelector = jest.mocked(useSelector);
const mockUseDispatch = jest.mocked(useDispatch);

const CAMPAIGN_ID = 'mas-campaign-1';
const SUBSCRIPTION_ID = 'sub-1';
const MOCK_STATS: MoneyAccountSweepstakesStatsMeDto = {
  entryCount: 3,
  currentBalanceUsd: 1250.5,
  yieldEarnedUsd: 12.34,
  qualifyingDepositsUsd: 1000,
  qualifyingThresholdUsd: 100,
  todayStatus: 'on_track',
  daysRemaining: 4,
};

function setupSelectors(
  rewardsOverrides: Partial<RewardsState>,
  subscriptionId: string | null = SUBSCRIPTION_ID,
) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) {
      return subscriptionId;
    }
    return selector(mockRootState);
  });
}

function createStatsCache(
  campaignId: string,
  overrides: {
    data?: MoneyAccountSweepstakesStatsMeDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    moneyAccountSweepstakesStats: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetMoneyAccountSweepstakesStatsMe', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createStatsCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetMoneyAccountSweepstakesStatsMe(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no rewards subscription', () => {
    setupSelectors(createStatsCache(CAMPAIGN_ID), null);

    renderHook(() => useGetMoneyAccountSweepstakesStatsMe(CAMPAIGN_ID));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches stats for the subscription and dispatches the success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_STATS as never);

    renderHook(() => useGetMoneyAccountSweepstakesStatsMe(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesStats({
          campaignId: CAMPAIGN_ID,
          stats: MOCK_STATS,
        }),
      );
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getMoneyAccountSweepstakesStatsMe',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches the error action when the request fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetMoneyAccountSweepstakesStatsMe(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesStatsError({
          campaignId: CAMPAIGN_ID,
          error: true,
        }),
      );
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns cached state and refetches on demand', async () => {
    setupSelectors(
      createStatsCache(CAMPAIGN_ID, {
        data: MOCK_STATS,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_STATS as never);

    const { result } = renderHook(() =>
      useGetMoneyAccountSweepstakesStatsMe(CAMPAIGN_ID),
    );

    expect(result.current.stats).toEqual(MOCK_STATS);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
