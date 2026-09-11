import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPredictThePitchPrizePool } from './useGetPredictThePitchPrizePool';
import {
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { PredictThePitchPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards', () => {
  const actual = jest.requireActual('../../../../reducers/rewards');
  return {
    ...actual,
    setPredictThePitchPrizePool: jest.fn((payload) => ({
      type: 'rewards/setPredictThePitchPrizePool',
      payload,
    })),
    setPredictThePitchPrizePoolLoading: jest.fn((payload) => ({
      type: 'rewards/setPredictThePitchPrizePoolLoading',
      payload,
    })),
    setPredictThePitchPrizePoolError: jest.fn((payload) => ({
      type: 'rewards/setPredictThePitchPrizePoolError',
      payload,
    })),
  };
});

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const CAMPAIGN_ID = 'predict-campaign-1';
const MOCK_PRIZE_POOL: PredictThePitchPrizePoolDto = {
  totalVolumeUsd: 1000,
  unlockedPoolUsd: 500,
  thresholdsUsd: [0, 1000],
  poolScheduleUsd: [250, 500],
  breakdown: [{ rank: 1, amountUsd: 500 }],
  computedAt: null,
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
    data?: PredictThePitchPrizePoolDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    predictThePitchPrizePools: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetPredictThePitchPrizePool', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createPrizePoolCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetPredictThePitchPrizePool(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches prize pool and dispatches success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PRIZE_POOL as never);

    renderHook(() => useGetPredictThePitchPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPredictThePitchPrizePool',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePool({
        campaignId: CAMPAIGN_ID,
        prizePool: MOCK_PRIZE_POOL,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error on failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetPredictThePitchPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns selector state and refetches', async () => {
    setupSelectors(
      createPrizePoolCache(CAMPAIGN_ID, {
        data: MOCK_PRIZE_POOL,
        loading: true,
        error: true,
      }),
    );
    mockCall.mockResolvedValue(MOCK_PRIZE_POOL as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchPrizePool(CAMPAIGN_ID),
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
