import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoLeaderboard } from './useGetOndoLeaderboard';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignLeaderboard,
  selectOndoCampaignLeaderboardLoading,
  selectOndoCampaignLeaderboardError,
  selectOndoCampaignLeaderboardTierNames,
  selectOndoCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards/selectors';
import {
  setOndoCampaignLeaderboard,
  setOndoCampaignLeaderboardLoading,
  setOndoCampaignLeaderboardError,
  setOndoCampaignLeaderboardSelectedTier,
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
  selectOndoCampaignLeaderboard: jest.fn(),
  selectOndoCampaignLeaderboardLoading: jest.fn(),
  selectOndoCampaignLeaderboardError: jest.fn(),
  selectOndoCampaignLeaderboardTierNames: jest.fn(),
  selectOndoCampaignLeaderboardSelectedTier: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

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
        { rank: 1, referralCode: 'ABC123', rateOfReturn: 0.15 },
        { rank: 2, referralCode: 'DEF456', rateOfReturn: 0.1 },
      ],
      totalParticipants: 50,
    },
    MID: {
      entries: [{ rank: 1, referralCode: 'GHI789', rateOfReturn: 0.2 }],
      totalParticipants: 30,
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
    if (selector === selectOndoCampaignLeaderboard) return state.leaderboard;
    if (selector === selectOndoCampaignLeaderboardLoading)
      return state.isLoading;
    if (selector === selectOndoCampaignLeaderboardError) return state.hasError;
    if (selector === selectOndoCampaignLeaderboardTierNames)
      return state.tierNames;
    if (selector === selectOndoCampaignLeaderboardSelectedTier)
      return state.selectedTier;
    return undefined;
  });
}

describe('useGetOndoLeaderboard', () => {
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

  it('does not fetch when campaignId is undefined but resets loading and error', async () => {
    renderHook(() => useGetOndoLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError(false),
    );
  });

  it('fetches leaderboard and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    // Wait for async operations
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboard(MOCK_LEADERBOARD),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading(false),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardLoading(false),
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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    act(() => {
      result.current.setSelectedTier('MID');
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier('MID'),
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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));
    mockDispatch.mockClear();

    act(() => {
      result.current.setSelectedTier('INVALID');
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier('INVALID'),
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
      useGetOndoLeaderboard(CAMPAIGN_ID, { defaultTier: 'MID' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier('MID'),
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
      useGetOndoLeaderboard(CAMPAIGN_ID, { defaultTier: 'UPPER' }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      setOndoCampaignLeaderboardSelectedTier('UPPER'),
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
      setOndoCampaignLeaderboardLoading(true),
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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

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

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    expect(result.current.hasError).toBe(true);
  });

  it('returns isLeaderboardNotYetComputed as false initially', () => {
    const { result } = renderHook(() => useGetOndoLeaderboard(undefined));

    expect(result.current.isLeaderboardNotYetComputed).toBe(false);
  });

  it('returns isLeaderboardNotYetComputed as false after successful fetch', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(false);
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
      setOndoCampaignLeaderboardError(true),
    );
  });

  it('dispatches setOndoCampaignLeaderboardError(true) on non-404 error', async () => {
    mockCall.mockRejectedValueOnce(new Error('Server error') as never);

    renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardError(true),
    );
  });

  it('returns isLeaderboardNotYetComputed as false when error is not a 404', async () => {
    mockCall.mockRejectedValueOnce(new Error('Server error') as never);

    const { result } = renderHook(() => useGetOndoLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLeaderboardNotYetComputed).toBe(false);
  });
});
