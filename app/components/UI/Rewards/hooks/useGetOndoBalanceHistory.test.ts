import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoBalanceHistory } from './useGetOndoBalanceHistory';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignBalanceHistoryById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignBalanceHistory } from '../../../../reducers/rewards';
import type { OndoGmBalanceHistoryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectCampaignParticipantOptedIn: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectOndoCampaignBalanceHistoryById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setOndoCampaignBalanceHistory: jest.fn((payload) => ({
    type: 'rewards/setOndoCampaignBalanceHistory',
    payload,
  })),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSelectOndoCampaignBalanceHistoryById =
  selectOndoCampaignBalanceHistoryById as jest.MockedFunction<
    typeof selectOndoCampaignBalanceHistoryById
  >;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';
const MOCK_BALANCE_HISTORY: OndoGmBalanceHistoryDto = {
  balance_history: [
    { date: '2026-03-01', balance_usd: '0.000000' },
    { date: '2026-03-10', balance_usd: '1500.000000' },
  ],
};

interface SelectorState {
  subscriptionId: string | null;
  balanceHistory: OndoGmBalanceHistoryDto | null;
  isOptedIn?: boolean;
}

function setupSelectors(state: SelectorState) {
  const isOptedIn = state.isOptedIn ?? true;
  const mockBalanceHistorySelector = jest
    .fn()
    .mockReturnValue(state.balanceHistory);
  const mockOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectOndoCampaignBalanceHistoryById.mockReturnValue(
    mockBalanceHistorySelector,
  );
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return state.subscriptionId;
    if (selector === mockBalanceHistorySelector) return state.balanceHistory;
    if (selector === mockOptedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetOndoBalanceHistory', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      balanceHistory: null,
    });
  });

  it('does not fetch when subscriptionId is missing', () => {
    setupSelectors({
      subscriptionId: null,
      balanceHistory: null,
    });

    const { result } = renderHook(() => useGetOndoBalanceHistory(CAMPAIGN_ID));

    expect(result.current.isLoading).toBe(false);
  });

  it('dispatches mock data when USE_MOCK_DATA is true', async () => {
    const { result } = renderHook(() => useGetOndoBalanceHistory(CAMPAIGN_ID));

    await waitFor(() => {
      expect(result.current.hasFetched).toBe(true);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignBalanceHistory({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        balanceHistory: expect.objectContaining({
          balance_history: expect.any(Array),
        }),
      }),
    );
    expect(result.current.hasError).toBe(false);
  });

  it('calls selectOndoCampaignBalanceHistoryById with subscriptionId and campaignId', async () => {
    renderHook(() => useGetOndoBalanceHistory(CAMPAIGN_ID));

    await waitFor(() => {
      expect(mockSelectOndoCampaignBalanceHistoryById).toHaveBeenCalled();
    });

    expect(mockSelectOndoCampaignBalanceHistoryById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
  });

  it('does not fetch when campaignId is undefined', () => {
    const { result } = renderHook(() => useGetOndoBalanceHistory(undefined));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasFetched).toBe(false);
  });

  it('does not fetch when user is not opted in', () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      balanceHistory: null,
      isOptedIn: false,
    });

    const { result } = renderHook(() => useGetOndoBalanceHistory(CAMPAIGN_ID));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasFetched).toBe(false);
  });
});
