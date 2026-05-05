import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetPerpsTradingCampaignLeaderboard } from './useGetPerpsTradingCampaignLeaderboard';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignLeaderboard,
  selectPerpsTradingCampaignLeaderboardLoading,
  selectPerpsTradingCampaignLeaderboardError,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignLeaderboard,
  setPerpsTradingCampaignLeaderboardLoading,
  setPerpsTradingCampaignLeaderboardError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectPerpsTradingCampaignLeaderboard: jest.fn(),
  selectPerpsTradingCampaignLeaderboardLoading: jest.fn(),
  selectPerpsTradingCampaignLeaderboardError: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
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
}));

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
    { rank: 1, referralCode: 'ABC123', pnl: 1500, qualified: true },
    { rank: 2, referralCode: 'DEF456', pnl: 800, qualified: true },
  ],
  totalParticipants: 50,
};

interface SelectorState {
  leaderboard: PerpsTradingCampaignLeaderboardDto | null;
  isLoading: boolean;
  hasError: boolean;
}

function setupSelectors(state: SelectorState) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsTradingCampaignLeaderboard)
      return state.leaderboard;
    if (selector === selectPerpsTradingCampaignLeaderboardLoading)
      return state.isLoading;
    if (selector === selectPerpsTradingCampaignLeaderboardError)
      return state.hasError;
    return undefined;
  });
}

describe('useGetPerpsTradingCampaignLeaderboard', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({ leaderboard: null, isLoading: false, hasError: false });
  });

  it('does not fetch when campaignId is undefined but resets loading and error', async () => {
    renderHook(() => useGetPerpsTradingCampaignLeaderboard(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading(false),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError(false),
    );
  });

  it('fetches leaderboard and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_LEADERBOARD as never);

    renderHook(() => useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError(false),
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPerpsTradingCampaignLeaderboard',
      CAMPAIGN_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboard(MOCK_LEADERBOARD),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading(false),
    );
  });

  it('dispatches error action on non-404 fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    renderHook(() => useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardError(true),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPerpsTradingCampaignLeaderboardLoading(false),
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
      setPerpsTradingCampaignLeaderboardError(true),
    );
  });

  it('returns leaderboard data from selector', () => {
    setupSelectors({
      leaderboard: MOCK_LEADERBOARD,
      isLoading: false,
      hasError: false,
    });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
  });

  it('returns loading state from selector', () => {
    setupSelectors({ leaderboard: null, isLoading: true, hasError: false });

    const { result } = renderHook(() =>
      useGetPerpsTradingCampaignLeaderboard(CAMPAIGN_ID),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state from selector', () => {
    setupSelectors({ leaderboard: null, isLoading: false, hasError: true });

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
      setPerpsTradingCampaignLeaderboardLoading(true),
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
