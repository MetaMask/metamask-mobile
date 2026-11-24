import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetMoneyAccountSweepstakesVolumeStats } from './useGetMoneyAccountSweepstakesVolumeStats';
import {
  setMoneyAccountSweepstakesVolumeStats,
  setMoneyAccountSweepstakesVolumeStatsLoading,
  setMoneyAccountSweepstakesVolumeStatsError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { MoneyAccountSweepstakesVolumeStatsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockUseSelector = jest.mocked(useSelector);
const mockUseDispatch = jest.mocked(useDispatch);

const CAMPAIGN_ID = 'mas-campaign-1';
const MOCK_VOLUME_STATS: MoneyAccountSweepstakesVolumeStatsDto = {
  totalVolumeUsd: 3000000,
  eligibleParticipantCount: 420,
  yieldEarnedUsd: 8123.55,
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createVolumeStatsCache(
  campaignId: string,
  overrides: {
    data?: MoneyAccountSweepstakesVolumeStatsDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    moneyAccountSweepstakesVolumeStats: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetMoneyAccountSweepstakesVolumeStats', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createVolumeStatsCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetMoneyAccountSweepstakesVolumeStats(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches volume stats and dispatches the success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_VOLUME_STATS as never);

    renderHook(() => useGetMoneyAccountSweepstakesVolumeStats(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesVolumeStats({
          campaignId: CAMPAIGN_ID,
          volumeStats: MOCK_VOLUME_STATS,
        }),
      );
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getMoneyAccountSweepstakesVolumeStats',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesVolumeStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesVolumeStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches the error action when the request fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetMoneyAccountSweepstakesVolumeStats(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesVolumeStatsError({
          campaignId: CAMPAIGN_ID,
          error: true,
        }),
      );
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesVolumeStatsLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns cached state and refetches on demand', async () => {
    setupSelectors(
      createVolumeStatsCache(CAMPAIGN_ID, {
        data: MOCK_VOLUME_STATS,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_VOLUME_STATS as never);

    const { result } = renderHook(() =>
      useGetMoneyAccountSweepstakesVolumeStats(CAMPAIGN_ID),
    );

    expect(result.current.volumeStats).toEqual(MOCK_VOLUME_STATS);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
