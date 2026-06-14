import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantOptedIn,
  selectPredictThePitchLeaderboardPositionById,
} from '../../../../reducers/rewards/selectors';
import { setPredictThePitchLeaderboardPosition } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useGetPredictThePitchLeaderboardPosition } from './useGetPredictThePitchLeaderboardPosition';
import type { PredictThePitchLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantOptedIn: jest.fn(),
  selectPredictThePitchLeaderboardPositionById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setPredictThePitchLeaderboardPosition: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchLeaderboardPosition',
    payload,
  })),
}));

jest.mock('./useInvalidateByRewardEvents', () => ({
  useInvalidateByRewardEvents: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSelectPositionById =
  selectPredictThePitchLeaderboardPositionById as jest.MockedFunction<
    typeof selectPredictThePitchLeaderboardPositionById
  >;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;
const mockUseInvalidateByRewardEvents =
  useInvalidateByRewardEvents as jest.MockedFunction<
    typeof useInvalidateByRewardEvents
  >;

const CAMPAIGN_ID = 'predict-campaign-1';
const SUBSCRIPTION_ID = 'sub-predict-1';
const MOCK_POSITION: PredictThePitchLeaderboardPositionDto = {
  rank: 1,
  totalParticipants: 10,
  roi: 0.25,
  pnl: 50,
  volume: 200,
  eligible: true,
  neighbors: [],
  computedAt: '2026-06-30T12:00:00.000Z',
  marketsTraded: 3,
  minimumMarketsTraded: 3,
};

async function flushHookEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

function setupSelectors({
  subscriptionId = SUBSCRIPTION_ID,
  position = null,
  isOptedIn = true,
}: {
  subscriptionId?: string | null;
  position?: PredictThePitchLeaderboardPositionDto | null;
  isOptedIn?: boolean;
}) {
  const positionSelector = jest.fn().mockReturnValue(position);
  const optedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectPositionById.mockReturnValue(positionSelector);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(optedInSelector);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === positionSelector) return position;
    if (selector === optedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetPredictThePitchLeaderboardPosition', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
  });

  it('does not fetch without subscription, campaign, or opt-in', () => {
    setupSelectors({ subscriptionId: null });
    renderHook(() => useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID));
    expect(mockCall).not.toHaveBeenCalled();

    setupSelectors({ isOptedIn: false });
    renderHook(() => useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID));
    expect(mockCall).not.toHaveBeenCalled();

    renderHook(() => useGetPredictThePitchLeaderboardPosition(undefined));
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches position and dispatches success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_POSITION as never);

    renderHook(() => useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID));

    await act(async () => {
      await flushHookEffects();
    });

    expect(mockSelectPositionById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPredictThePitchLeaderboardPosition',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchLeaderboardPosition({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        position: MOCK_POSITION,
      }),
    );
  });

  it('sets hasError on failure and returns selector state', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID),
    );

    await act(async () => {
      await flushHookEffects();
    });

    expect(result.current.hasError).toBe(true);

    setupSelectors({ position: MOCK_POSITION, isOptedIn: false });
    const { result: withPosition } = renderHook(() =>
      useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID),
    );

    expect(withPosition.current.position).toEqual(MOCK_POSITION);
  });

  it('refetches and subscribes to invalidation events', async () => {
    mockCall.mockResolvedValue(MOCK_POSITION as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchLeaderboardPosition(CAMPAIGN_ID),
    );

    await act(async () => {
      await flushHookEffects();
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        'RewardsController:leaderboardPositionInvalidated',
      ]),
      expect.any(Function),
    );
  });
});
