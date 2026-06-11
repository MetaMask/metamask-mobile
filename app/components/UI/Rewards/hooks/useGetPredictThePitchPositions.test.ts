import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantOptedIn,
  selectPredictThePitchPositionsById,
} from '../../../../reducers/rewards/selectors';
import { setPredictThePitchPositions } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useGetPredictThePitchPositions } from './useGetPredictThePitchPositions';
import type { PredictThePitchPositionsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  selectPredictThePitchPositionsById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setPredictThePitchPositions: jest.fn((payload) => ({
    type: 'rewards/setPredictThePitchPositions',
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
const mockSelectPositionsById =
  selectPredictThePitchPositionsById as jest.MockedFunction<
    typeof selectPredictThePitchPositionsById
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
const MOCK_POSITIONS: PredictThePitchPositionsDto = {
  openPositions: [
    {
      outcomeAssetId: 'token-1',
      outcomeAsset: 'Yes',
      conditionId: '0xcondition',
      conditionName: 'Brazil vs Argentina',
      conditionSlug: 'brazil-vs-argentina',
      eventId: '0xnav',
      eventSlug: 'world-cup',
      iconUrl: null,
      capitalDeployed: 200,
      pnl: 50,
      roi: 0.25,
      status: 'open',
      fillShares: 100,
      fillSharesBought: 100,
      fillSharesSold: 0,
      fillPrice: 2,
      fillDate: '2026-06-30T12:00:00.000Z',
    },
  ],
  resolvedPositions: [],
  computedAt: '2026-06-30T12:00:00.000Z',
};

async function flushHookEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

function setupSelectors({
  subscriptionId = SUBSCRIPTION_ID,
  positions = null,
  isOptedIn = true,
}: {
  subscriptionId?: string | null;
  positions?: PredictThePitchPositionsDto | null;
  isOptedIn?: boolean;
}) {
  const positionsSelector = jest.fn().mockReturnValue(positions);
  const optedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectPositionsById.mockReturnValue(positionsSelector);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(optedInSelector);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === positionsSelector) return positions;
    if (selector === optedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetPredictThePitchPositions', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({});
  });

  it('does not fetch without subscription, campaign, or opt-in', () => {
    setupSelectors({ subscriptionId: null });
    renderHook(() => useGetPredictThePitchPositions(CAMPAIGN_ID));
    expect(mockCall).not.toHaveBeenCalled();

    setupSelectors({ isOptedIn: false });
    renderHook(() => useGetPredictThePitchPositions(CAMPAIGN_ID));
    expect(mockCall).not.toHaveBeenCalled();

    renderHook(() => useGetPredictThePitchPositions(undefined));
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('fetches positions and dispatches success action', async () => {
    mockCall.mockResolvedValueOnce(MOCK_POSITIONS as never);

    renderHook(() => useGetPredictThePitchPositions(CAMPAIGN_ID));

    await act(async () => {
      await flushHookEffects();
    });

    expect(mockSelectPositionsById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getPredictThePitchPositions',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setPredictThePitchPositions({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        positions: MOCK_POSITIONS,
      }),
    );
  });

  it('sets hasError on failure and returns selector state', async () => {
    mockCall.mockRejectedValueOnce(new Error('network') as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchPositions(CAMPAIGN_ID),
    );

    await act(async () => {
      await flushHookEffects();
    });

    expect(result.current.hasError).toBe(true);

    setupSelectors({ positions: MOCK_POSITIONS, isOptedIn: false });
    const { result: withPositions } = renderHook(() =>
      useGetPredictThePitchPositions(CAMPAIGN_ID),
    );

    expect(withPositions.current.positions).toEqual(MOCK_POSITIONS);
  });

  it('refetches and subscribes to invalidation events', async () => {
    mockCall.mockResolvedValue(MOCK_POSITIONS as never);

    const { result } = renderHook(() =>
      useGetPredictThePitchPositions(CAMPAIGN_ID),
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
