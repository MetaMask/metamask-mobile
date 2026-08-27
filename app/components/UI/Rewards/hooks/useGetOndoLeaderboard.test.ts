import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoLeaderboard } from './useGetOndoLeaderboard';
import Engine from '../../../../core/Engine';
import {
  setOndoCampaignLeaderboard,
  setOndoCampaignLeaderboardLoading,
  setOndoCampaignLeaderboardError,
  setOndoCampaignLeaderboardSelectedTier,
  initialState,
  type RewardsState,
} from '../../../../reducers/rewards';
import type { RootState } from '../../../../reducers';
import type { CampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
    setOndoCampaignLeaderboard: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignLeaderboard',
      payload,
    })),
    setOndoCampaignLeaderboardLoading: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignLeaderboardLoading',
      payload,
    })),
    setOndoCampaignLeaderboardError: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignLeaderboardError',
      payload,
    })),
    setOndoCampaignLeaderboardSelectedTier: jest.fn((payload) => ({
      type: 'rewards/setOndoCampaignLeaderboardSelectedTier',
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
const MOCK_LEADERBOARD: CampaignLeaderboardDto = {
  campaignId: CAMPAIGN_ID,
  computedAt: '2024-03-20T12:00:00.000Z',
  tiers: {
    STARTER: {
      entries: [
        {
          rank: 1,
          referralCode: 'ABC123',
          rateOfReturn: 0.15,
          qualifiedDays: 10,
          qualified: true,
        },
        {
          rank: 2,
          referralCode: 'DEF456',
          rateOfReturn: 0.1,
          qualifiedDays: 10,
          qualified: true,
        },
      ],
      totalParticipants: 50,
    },
    MID: {
      entries: [
        {
          rank: 1,
          referralCode: 'GHI789',
          rateOfReturn: 0.2,
          qualifiedDays: 10,
          qualified: true,
        },
      ],
      totalParticipants: 30,
    },
  },
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
    data?: CampaignLeaderboardDto | null;
    loading?: boolean;
    error?: boolean;
    selectedTier?: string | null;
  } = {},
): Partial<RewardsState> {
  return {
    ondoCampaignLeaderboards: {
      [campaignId]: {
        data: overrides.data ?? null,
        loading: overrides.loading ?? false,
        error: overrides.error ?? false,
        selectedTier: overrides.selectedTier ?? null,
      },
    },
  };
}

describe('useGetOndoLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID));
  });

  it('does not fetch when campaignId is undefined', async () => {
    renderHook(() => useGetOndoLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches leaderboard and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError({
        campaignId: CAMPAIGN_ID,
        error: false,
      }),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboard({
        campaignId: CAMPAIGN_ID,
        leaderboard: MOCK_LEADERBOARD,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError({ campaignId: CAMPAIGN_ID, error: true }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: false,
      }),
    );
  });

  it('returns leaderboard data from selector', () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, {
        data: MOCK_LEADERBOARD,
        selectedTier: 'STARTER',
      }),
    );

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
    expect(result.current.selectedTier).toBe('STARTER');
    expect(result.current.computedAt).toBe('2024-03-20T12:00:00.000Z');
  });

  it('returns selectedTierData for the currently selected tier', () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, {
        data: MOCK_LEADERBOARD,
        selectedTier: 'MID',
      }),
    );

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.selectedTierData).toEqual(MOCK_LEADERBOARD.tiers.MID);
  });

  it('returns null for selectedTierData when no tier is selected', () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, {
        data: MOCK_LEADERBOARD,
        selectedTier: null,
      }),
    );

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.selectedTierData).toBeNull();
  });

  it('setSelectedTier dispatches action when tier is valid', () => {
    setupSelectors(
      createLeaderboardCache(CAMPAIGN_ID, {
        data: MOCK_LEADERBOARD,
        selectedTier: 'STARTER',
      }),
    );

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    act(() => {
      result.current.setSelectedTier('MID');
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier({
        campaignId: CAMPAIGN_ID,
        tier: 'MID',
      }),
    );
  });

  it('applies defaultTier when it becomes available', async () => {
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID));

    renderHook(() =>
      useGetOndoLeaderboard(CAMPAIGN_ID, { defaultTier: 'MID' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier({
        campaignId: CAMPAIGN_ID,
        tier: 'MID',
      }),
    );
  });

  it('refetch function re-fetches the leaderboard', async () => {
    mockCall.mockResolvedValue(MOCK_LEADERBOARD as never);

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading({
        campaignId: CAMPAIGN_ID,
        loading: true,
      }),
    );
  });

  it('returns loading state from selector', () => {
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID, { loading: true }));

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors(createLeaderboardCache(CAMPAIGN_ID, { error: true }));

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.hasError).toBe(true);
  });

  it('returns isLeaderboardNotYetComputed as true on 404 error', async () => {
    mockCall.mockRejectedValueOnce(
      new Error('Get campaign leaderboard failed: 404') as never,
    );

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError({ campaignId: CAMPAIGN_ID, error: true }),
    );
  });

  it('dispatches setOndoCampaignLeaderboardError on non-404 error', async () => {
    mockCall.mockRejectedValueOnce(new Error('Server error') as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError({ campaignId: CAMPAIGN_ID, error: true }),
    );
  });
});
