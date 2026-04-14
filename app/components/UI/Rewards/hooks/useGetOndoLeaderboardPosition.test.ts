import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoLeaderboardPosition } from './useGetOndoLeaderboardPosition';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignLeaderboardPositionById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignLeaderboardPosition } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectCampaignParticipantOptedIn: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectOndoCampaignLeaderboardPositionById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setOndoCampaignLeaderboardPosition: jest.fn((payload) => ({
    type: 'rewards/setOndoCampaignLeaderboardPosition',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseInvalidateByRewardEvents =
  useInvalidateByRewardEvents as jest.MockedFunction<
    typeof useInvalidateByRewardEvents
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSelectCampaignLeaderboardPositionById =
  selectOndoCampaignLeaderboardPositionById as jest.MockedFunction<
    typeof selectOndoCampaignLeaderboardPositionById
  >;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';
const MOCK_POSITION: CampaignLeaderboardPositionDto = {
  projectedTier: 'MID',
  rank: 5,
  totalInTier: 150,
  rateOfReturn: 0.15,
  currentUsdValue: 12500.5,
  totalUsdDeposited: 10000.0,
  netDeposit: 8500.0,
  computedAt: '2024-03-20T12:00:00.000Z',
};

interface SelectorState {
  subscriptionId: string | null;
  position: CampaignLeaderboardPositionDto | null;
  isOptedIn?: boolean;
}

function setupSelectors(state: SelectorState) {
  const isOptedIn = state.isOptedIn ?? true;
  const mockPositionSelector = jest.fn().mockReturnValue(state.position);
  const mockOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectCampaignLeaderboardPositionById.mockReturnValue(
    mockPositionSelector,
  );
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return state.subscriptionId;
    if (selector === mockPositionSelector) return state.position;
    if (selector === mockOptedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetOndoLeaderboardPosition', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      position: null,
    });
  });

  it('does not fetch when subscriptionId is missing', async () => {
    setupSelectors({
      subscriptionId: null,
      position: null,
    });

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('does not fetch when not opted in', async () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      position: null,
      isOptedIn: false,
    });

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('does not fetch when campaignId is undefined', async () => {
    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(undefined),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('fetches position and dispatches actions on success', async () => {
    mockCall.mockResolvedValueOnce(MOCK_POSITION as never);

    renderHook(() => useGetOndoLeaderboardPosition(CAMPAIGN_ID));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignLeaderboardPosition',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignLeaderboardPosition({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        position: MOCK_POSITION,
      }),
    );
  });

  it('dispatches error action on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasError).toBe(true);
  });

  it('returns position data from selector', () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      position: MOCK_POSITION,
    });

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.position).toEqual(MOCK_POSITION);
  });

  it('returns loading state', async () => {
    mockCall.mockResolvedValue(MOCK_POSITION as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    // Wait for the fetch to complete
    await act(async () => {
      await waitForNextUpdate();
    });

    // After fetch completes, check the final state
    expect(result.current.isLoading).toBe(false);
  });

  it('returns error state', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasError).toBe(true);
  });

  it('refetch function re-fetches the position', async () => {
    mockCall.mockResolvedValue(MOCK_POSITION as never);

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    await act(async () => {
      await Promise.resolve();
    });

    mockDispatch.mockClear();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('returns null position when not loaded', () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      position: null,
    });

    const { result } = renderHook(() =>
      useGetOndoLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(result.current.position).toBeNull();
  });

  it('calls selectOndoCampaignLeaderboardPositionById with subscriptionId and campaignId', () => {
    renderHook(() => useGetOndoLeaderboardPosition(CAMPAIGN_ID));

    expect(mockSelectCampaignLeaderboardPositionById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
  });

  it('subscribes to RewardsController:leaderboardPositionInvalidated to auto-refetch', () => {
    renderHook(() => useGetOndoLeaderboardPosition(CAMPAIGN_ID));

    expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        'RewardsController:leaderboardPositionInvalidated',
      ]),
      expect.any(Function),
    );
  });
});
