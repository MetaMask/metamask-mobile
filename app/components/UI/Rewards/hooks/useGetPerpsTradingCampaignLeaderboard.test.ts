import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetPerpsTradingCampaignLeaderboard } from './useGetPerpsTradingCampaignLeaderboard';
import Engine from '../../../../core/Engine';
import {
  setPerpsTradingCampaignLeaderboard,
  setPerpsTradingCampaignLeaderboardLoading,
  setPerpsTradingCampaignLeaderboardError,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { PerpsTradingCampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
    setPerpsTradingCampaignLeaderboard: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignLeaderboard',
      payload,
    })),
    setPerpsTradingCampaignLeaderboardLoading: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignLeaderboardLoading',
      payload,
    })),
    setPerpsTradingCampaignLeaderboardError: jest.fn((payload) => ({
      type: 'rewards/setPerpsTradingCampaignLeaderboardError',
      payload,
    })),
  };
});

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_LEADERBOARD: PerpsTradingCampaignLeaderboardDto = {
  campaignId: CAMPAIGN_ID,
  computedAt: '2024-03-20T12:00:00.000Z',
  entries: [
    { rank: 1, referralCode: 'ABC123', pnl: 1500, volume: 30_000 },
    { rank: 2, referralCode: 'DEF456', pnl: 800, volume: 28_000 },
  ],
  totalParticipants: 50,
  minVolumeForEligibility: 25_000,
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
    data?: PerpsTradingCampaignLeaderboardDto | null;
    loading?: boolean;
    error?: boolean;
  } = {},
): Partial<RewardsState> {
  return {
    perpsTradingCampaignLeaderboards: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
      },
    },
  };
}

describe('useGetPerpsTradingCampaignLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', async () => {
    renderHook(() => useGetPerpsTradingCampaignLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches leaderboard and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboard({
        campaignId: CAMPAIGN_ID,
        leaderboard: MOCK_LEADERBOARD,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error action on non-404 fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns isLeaderboardNotYetComputed true on 404 error', async () => {
    mockCall.mockRejectedValueOnce(
      new Error('leaderboard failed: 404') as never,
    );

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: true,
      }),
    );
  });

  it('returns leaderboard data from selector', () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, { data: MOCK_LEADERBOARD }),
    );

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
  });

  it('returns loading state from selector', () => {
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID, { loading: true }));

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID, { error: true }));

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('refetch function re-fetches the leaderboard', async () => {
    mockCall.mockResolvedValue(MOCK_LEADERBOARD as never);

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
  });

  it('returns isLeaderboardNotYetComputed false initially', () => {
    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(undefined),
    );

    expect(result.current.isLeaderboardNotYetComputed).toBe(false);
  });

  it('returns isLeaderboardNotYetComputed false on non-404 error', async () => {
    mockCall.mockRejectedValueOnce(new Error('Server error') as never);

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(false);
  });
});
