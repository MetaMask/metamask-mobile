import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoPortfolioPosition } from './useGetOndoPortfolioPosition';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignPortfolioById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignPortfolioPosition } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type { OndoGmPortfolioDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  selectOndoCampaignPortfolioById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setOndoCampaignPortfolioPosition: jest.fn((payload) => ({
    type: 'rewards/setOndoCampaignPortfolioPosition',
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
const mockSelectOndoCampaignPortfolioById =
  selectOndoCampaignPortfolioById as jest.MockedFunction<
    typeof selectOndoCampaignPortfolioById
  >;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';
const MOCK_PORTFOLIO: OndoGmPortfolioDto = {
  positions: [],
  summary: {
    totalCurrentValue: '0',
    totalCostBasis: '0',
    totalUsdDeposited: '0',
    netDeposit: '0',
    portfolioPnl: '0',
    portfolioPnlPercent: '0',
  },
  computedAt: '2024-03-20T12:00:00.000Z',
};

interface SelectorState {
  subscriptionId: string | null;
  portfolio: OndoGmPortfolioDto | null;
  isOptedIn?: boolean;
}

function setupSelectors(state: SelectorState) {
  const isOptedIn = state.isOptedIn ?? true;
  const mockPortfolioSelector = jest.fn().mockReturnValue(state.portfolio);
  const mockOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectOndoCampaignPortfolioById.mockReturnValue(mockPortfolioSelector);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return state.subscriptionId;
    if (selector === mockPortfolioSelector) return state.portfolio;
    if (selector === mockOptedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetOndoPortfolioPosition', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      portfolio: null,
    });
  });

  it('does not fetch when subscriptionId is missing', async () => {
    setupSelectors({
      subscriptionId: null,
      portfolio: null,
    });

    const { result } = renderHook(() =>
      useGetOndoPortfolioPosition(CAMPAIGN_ID),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches portfolio and dispatches result', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PORTFOLIO as never);

    const { result } = renderHook(() =>
      useGetOndoPortfolioPosition(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.hasFetched).toBe(true);
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignPortfolioPosition',
      CAMPAIGN_ID,
      SUBSCRIPTION_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignPortfolioPosition({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        portfolio: MOCK_PORTFOLIO,
      }),
    );
    expect(result.current.hasFetched).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('subscribes to RewardsController:portfolioPositionInvalidated to auto-refetch', async () => {
    mockCall.mockResolvedValue(MOCK_PORTFOLIO);

    renderHook(() => useGetOndoPortfolioPosition(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockUseInvalidateByRewardEvents).toHaveBeenCalled();
    });

    expect(mockUseInvalidateByRewardEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        'RewardsController:portfolioPositionInvalidated',
      ]),
      expect.any(Function),
    );
  });

  it('calls selectOndoCampaignPortfolioById with subscriptionId and campaignId', async () => {
    mockCall.mockResolvedValue(MOCK_PORTFOLIO);

    renderHook(() => useGetOndoPortfolioPosition(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockSelectOndoCampaignPortfolioById).toHaveBeenCalled();
    });

    expect(mockSelectOndoCampaignPortfolioById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
  });
});
