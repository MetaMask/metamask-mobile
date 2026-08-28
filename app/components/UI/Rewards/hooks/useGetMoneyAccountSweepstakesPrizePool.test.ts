import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetMoneyAccountSweepstakesPrizePool } from './useGetMoneyAccountSweepstakesPrizePool';
import {
  setMoneyAccountSweepstakesPrizePool,
  setMoneyAccountSweepstakesPrizePoolLoading,
  setMoneyAccountSweepstakesPrizePoolError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { MoneyAccountSweepstakesPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
const MOCK_PRIZE_POOL: MoneyAccountSweepstakesPrizePoolDto = {
  totalVolumeUsd: 1000,
  unlockedPoolUsd: 500,
  thresholdsUsd: [0, 1000],
  poolScheduleUsd: [250, 500],
  numberOfWinners: 3,
  minPrizeUsd: 50,
  maxPrizeUsd: 250,
};

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createPrizePoolCache(
  campaignId: string,
  overrides: {
    data?: MoneyAccountSweepstakesPrizePoolDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    moneyAccountSweepstakesPrizePools: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetMoneyAccountSweepstakesPrizePool', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createPrizePoolCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetMoneyAccountSweepstakesPrizePool(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches the prize pool and dispatches the success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PRIZE_POOL as never);

    renderHook(() => useGetMoneyAccountSweepstakesPrizePool(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesPrizePool({
          campaignId: CAMPAIGN_ID,
          prizePool: MOCK_PRIZE_POOL,
        }),
      );
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getMoneyAccountSweepstakesPrizePool',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches the error action when the request fails', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetMoneyAccountSweepstakesPrizePool(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyAccountSweepstakesPrizePoolError({
          campaignId: CAMPAIGN_ID,
          error: true,
        }),
      );
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      setMoneyAccountSweepstakesPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns cached state and refetches on demand', async () => {
    setupSelectors(
      createPrizePoolCache(CAMPAIGN_ID, {
        data: MOCK_PRIZE_POOL,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_PRIZE_POOL as never);

    const { result } = renderHook(() =>
      useGetMoneyAccountSweepstakesPrizePool(CAMPAIGN_ID),
    );

    expect(result.current.prizePool).toEqual(MOCK_PRIZE_POOL);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
