import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useGetPredictThePitchLeaderboard } from './useGetPredictThePitchLeaderboard';
import {
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { PredictThePitchLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  };
});

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

function setupSelectors(rewardsOverrides: Partial<RewardsState>) {
  const mockRootState = {
    rewards: { ...initialState, ...rewardsOverrides },
  } as RootState;
  mockUseSelector.mockImplementation((selector) => selector(mockRootState));
}

function createLeaderboardCache(
  campaignId: string,
  overrides: {
    data?: PredictThePitchLeaderboardDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    predictThePitchLeaderboards: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetPredictThePitchLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', () => {
    renderHook(() => useGetPredictThePitchLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
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
      setPredictThePitchLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboard({
        campaignId: CAMPAIGN_ID,
        leaderboard: MOCK_LEADERBOARD,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('sets error on non-404 failure and not-yet-computed on 404', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);
    renderHook(() => useGetPredictThePitchLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );

    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID));
    mockCall.mockRejectedValueOnce(new Error('not found: 404') as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchLeaderboard(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setPredictThePitchLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
  });

  it('returns selector state and refetches', async () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, {
        data: MOCK_LEADERBOARD,
        loading: true,
        error: true,
      }),
    );
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
