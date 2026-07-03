import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPredictThePitchLeaderboard } from './useGetPredictThePitchLeaderboard';
import {
  selectPredictThePitchLeaderboard,
  selectPredictThePitchLeaderboardLoading,
  selectPredictThePitchLeaderboardError,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
} from '../../../../reducers/rewards';
import type { PredictThePitchLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPredictThePitchLeaderboard: jest.fn(),
  selectPredictThePitchLeaderboardLoading: jest.fn(),
  selectPredictThePitchLeaderboardError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setPredictThePitchLeaderboard: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchLeaderboard',
    payload,
  })),
  setPredictThePitchLeaderboardLoading: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchLeaderboardLoading',
    payload,
  })),
  setPredictThePitchLeaderboardError: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchLeaderboardError',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const CAMPAIGN_ID = 'predict-campaign-1';
const MOCK_LEADERBOARD: PredictThePitchLeaderboardDto = {
  campaignId: CAMPAIGN_ID,
  computedAt: '2026-06-30T12:00:00.000Z',
  entries: [],
  totalParticipants: 10,
};

function setupSelectors({
  leaderboard = null,
  isLoading = false,
  hasError = false,
}: {
  leaderboard?: PredictThePitchLeaderboardDto | null;
  isLoading?: boolean;
  hasError?: boolean;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPredictThePitchLeaderboard) return leaderboard;
    if (selector === selectPredictThePitchLeaderboardLoading) return isLoading;
    if (selector === selectPredictThePitchLeaderboardError) return hasError;
    return undefined;
  });
}

describe('useGetPredictThePitchLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
  });

  it('does not fetch without campaignId and resets loading/error state', () => {
    renderHook(() => useGetPredictThePitchLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError(false),
    );
  });

  it('fetches leaderboard and dispatches success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetPredictThePitchLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPredictThePitchLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboard(MOCK_LEADERBOARD),
    );
  });

  it('sets error on non-404 failure and not-yet-computed on 404', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);
    renderHook(() => useGetPredictThePitchLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError(true),
    );

    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
    mockCall.mockRejectedValueOnce(new Error('not found: 404') as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchLeaderboard(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError(true),
    );
  });

  it('returns selector state and refetches', async () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: true,
      hasError: true,
    });
    mockCall.mockResolvedValue(MOCK_LEADERBOARD as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });
});
