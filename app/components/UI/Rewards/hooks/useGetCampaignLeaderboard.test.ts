import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetCampaignLeaderboard } from './useGetCampaignLeaderboard';
import Engine from '../../../../core/Engine';
import {
  selectCampaignLeaderboard,
  selectCampaignLeaderboardLoading,
  selectCampaignLeaderboardError,
  selectCampaignLeaderboardTierNames,
  selectCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards/selectors';
import {
  setCampaignLeaderboard,
  setCampaignLeaderboardLoading,
  setCampaignLeaderboardError,
  setCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards';
import type { CampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignLeaderboard: jest.fn(),
  selectCampaignLeaderboardLoading: jest.fn(),
  selectCampaignLeaderboardError: jest.fn(),
  selectCampaignLeaderboardTierNames: jest.fn(),
  selectCampaignLeaderboardSelectedTier: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignLeaderboard: jest.fn((payload) => ({
    type: 'rewards/setCampaignLeaderboard',
    payload,
  })),
  setCampaignLeaderboardLoading: jest.fn((payload) => ({
    type: 'rewards/setCampaignLeaderboardLoading',
    payload,
  })),
  setCampaignLeaderboardError: jest.fn((payload) => ({
    type: 'rewards/setCampaignLeaderboardError',
    payload,
  })),
  setCampaignLeaderboardSelectedTier: jest.fn((payload) => ({
    type: 'rewards/setCampaignLeaderboardSelectedTier',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;

const CAMPAIGN_ID = 'campaign-123';
const MOCK_LEADERBOARD: CampaignLeaderboardDto = {
  campaign_id: CAMPAIGN_ID,
  computed_at: '2024-03-20T12:00:00.000Z',
  tiers: {
    STARTER: {
      entries: [
        { rank: 1, referral_code: 'ABC123', rate_of_return: 0.15 },
        { rank: 2, referral_code: 'DEF456', rate_of_return: 0.1 },
      ],
      total_participants: 50,
    },
    MID: {
      entries: [{ rank: 1, referral_code: 'GHI789', rate_of_return: 0.2 }],
      total_participants: 30,
    },
  },
};

interface SelectorState {
  leaderboard: CampaignLeaderboardDto | null;
  isLoading: boolean;
  hasError: boolean;
  tierNames: string[];
  selectedTier: string | null;
}

function setupSelectors(state: SelectorState) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCampaignLeaderboard) return state.leaderboard;
    if (selector === selectCampaignLeaderboardLoading) return state.isLoading;
    if (selector === selectCampaignLeaderboardError) return state.hasError;
    if (selector === selectCampaignLeaderboardTierNames) return state.tierNames;
    if (selector === selectCampaignLeaderboardSelectedTier)
      return state.selectedTier;
    return undefined;
  });
}

describe('useGetCampaignLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      leaderboard: null,
      isLoading: false,
      hasError: false,
      tierNames: [],
      selectedTier: null,
    });
  });

  it('does not fetch when campaignId is undefined', async () => {
    renderHook(() => useGetCampaignLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('fetches leaderboard and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    // Wait for async operations
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboard(MOCK_LEADERBOARD),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardLoading(false),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardLoading(false),
    );
  });

  it('returns leaderboard data from selector', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: 'STARTER',
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
    expect(result.current.tierNames).toEqual(['STARTER', 'MID']);
    expect(result.current.selectedTier).toBe('STARTER');
    expect(result.current.computedAt).toBe('2024-03-20T12:00:00.000Z');
  });

  it('returns selectedTierData for the currently selected tier', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: 'MID',
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    expect(result.current.selectedTierData).toEqual(MOCK_LEADERBOARD.tiers.MID);
  });

  it('returns null for selectedTierData when no tier is selected', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: null,
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    expect(result.current.selectedTierData).toBeNull();
  });

  it('setSelectedTier dispatches action when tier is valid', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: 'STARTER',
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    act(() => {
      result.current.setSelectedTier('MID');
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardSelectedTier('MID'),
    );
  });

  it('setSelectedTier does not dispatch action when tier is invalid', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: 'STARTER',
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));
    mockDispatch.mockClear();

    act(() => {
      result.current.setSelectedTier('INVALID');
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setCampaignLeaderboardSelectedTier('INVALID'),
    );
  });

  it('applies defaultTier when it becomes available', async () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: null,
    });

    renderHook(() =>
      useGetCampaignLeaderboard(CAMPAIGN_ID, { defaultTier: 'MID' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardSelectedTier('MID'),
    );
  });

  it('does not apply defaultTier when it is not in tierNames', async () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
      tierNames: ['STARTER', 'MID'],
      selectedTier: null,
    });
    mockDispatch.mockClear();

    renderHook(() =>
      useGetCampaignLeaderboard(CAMPAIGN_ID, { defaultTier: 'UPPER' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setCampaignLeaderboardSelectedTier('UPPER'),
    );
  });

  it('refetch function re-fetches the leaderboard', async () => {
    mockCall.mockResolvedValue(MOCK_LEADERBOARD as never);

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenCalledWith(
      setCampaignLeaderboardLoading(true),
    );
  });

  it('returns loading state from selector', () => {
    setupSelectors({
      leaderboard: null,
      isLoading: true,
      hasError: false,
      tierNames: [],
      selectedTier: null,
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors({
      leaderboard: null,
      isLoading: false,
      hasError: true,
      tierNames: [],
      selectedTier: null,
    });

    const { result } = renderHook(() => useGetCampaignLeaderboard(CAMPAIGN_ID));

    expect(result.current.hasError).toBe(true);
  });
});
