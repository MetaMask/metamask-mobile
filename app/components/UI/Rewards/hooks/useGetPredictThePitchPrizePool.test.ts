import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPredictThePitchPrizePool } from './useGetPredictThePitchPrizePool';
import {
  selectPredictThePitchPrizePool,
  selectPredictThePitchPrizePoolLoading,
  selectPredictThePitchPrizePoolError,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
} from '../../../../reducers/rewards';
import type { PredictThePitchPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPredictThePitchPrizePool: jest.fn(),
  selectPredictThePitchPrizePoolLoading: jest.fn(),
  selectPredictThePitchPrizePoolError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

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

function setupSelectors({
  prizePool = null,
  isLoading = false,
  hasError = false,
}: {
  prizePool?: PredictThePitchPrizePoolDto | null;
  isLoading?: boolean;
  hasError?: boolean;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPredictThePitchPrizePool) return prizePool;
    if (selector === selectPredictThePitchPrizePoolLoading) return isLoading;
    if (selector === selectPredictThePitchPrizePoolError) return hasError;
    return undefined;
  });
}

describe('useGetPredictThePitchPrizePool', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
  });

  it('does not fetch without campaignId and resets loading/error state', () => {
    renderHook(() => useGetPredictThePitchPrizePool(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolError(false),
    );
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
      setPredictThePitchPrizePool(MOCK_PRIZE_POOL),
    );
  });

  it('dispatches error on failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    renderHook(() => useGetPredictThePitchPrizePool(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPrizePoolLoading(false),
    );
  });

  it('returns selector state and refetches', async () => {
    setupSelectors({
      prizePool: MOCK_PRIZE_POOL,
      isLoading: true,
      hasError: true,
    });
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
