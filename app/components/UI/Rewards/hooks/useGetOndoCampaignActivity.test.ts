import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useGetOndoCampaignActivity } from './useGetOndoCampaignActivity';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignActivityById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignActivity } from '../../../../reducers/rewards';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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
  selectOndoCampaignActivityById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setOndoCampaignActivity: jest.fn((payload) => ({
    type: 'rewards/setOndoCampaignActivity',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSelectOndoCampaignActivityById =
  selectOndoCampaignActivityById as jest.MockedFunction<
    typeof selectOndoCampaignActivityById
  >;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const CAMPAIGN_ID = 'campaign-123';
const SUBSCRIPTION_ID = 'sub-456';

const MOCK_ENTRY: OndoGmActivityEntryDto = {
  type: 'DEPOSIT',
  srcToken: {
    tokenAsset: 'eip155:59144/erc20:0xabc',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
  },
  destToken: null,
  destAddress: null,
  usdAmount: '5000.000000',
  timestamp: '2026-03-28T14:30:00.000Z',
};

const MOCK_PAGE_1 = {
  results: [MOCK_ENTRY],
  has_more: true,
  cursor: 'page-2-cursor',
};

const MOCK_PAGE_2 = {
  results: [{ ...MOCK_ENTRY, timestamp: '2026-03-27T10:00:00.000Z' }],
  has_more: false,
  cursor: null,
};

interface SelectorState {
  subscriptionId: string | null;
  cachedActivity: OndoGmActivityEntryDto[] | null;
  isOptedIn?: boolean;
}

function setupSelectors(state: SelectorState) {
  const isOptedIn = state.isOptedIn ?? true;
  const mockActivitySelector = jest.fn().mockReturnValue(state.cachedActivity);
  const mockOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectOndoCampaignActivityById.mockReturnValue(mockActivitySelector);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return state.subscriptionId;
    if (selector === mockActivitySelector) return state.cachedActivity;
    if (selector === mockOptedInSelector) return isOptedIn;
    return undefined;
  });
}

describe('useGetOndoCampaignActivity', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedActivity: null,
    });
  });

  it('does not fetch when subscriptionId is missing', async () => {
    setupSelectors({ subscriptionId: null, cachedActivity: null });

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activityEntries).toBeNull();
  });

  it('does not fetch when campaignId is undefined', async () => {
    const { result } = renderHook(() => useGetOndoCampaignActivity(undefined));

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.activityEntries).toBeNull();
  });

  it('does not fetch when not opted in', async () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedActivity: null,
      isOptedIn: false,
    });

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.activityEntries).toBeNull();
  });

  it('fetches first page and dispatches result', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PAGE_1 as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.activityEntries).toEqual(MOCK_PAGE_1.results);
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignActivity',
      {
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        cursor: null,
      },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setOndoCampaignActivity({
        subscriptionId: SUBSCRIPTION_ID,
        campaignId: CAMPAIGN_ID,
        entries: MOCK_PAGE_1.results,
      }),
    );
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network failure') as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Network failure');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activityEntries).toBeNull();
  });

  it('loads more pages and appends results', async () => {
    mockCall
      .mockResolvedValueOnce(MOCK_PAGE_1 as never)
      .mockResolvedValueOnce(MOCK_PAGE_2 as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsController:getOndoCampaignActivity',
      {
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        cursor: 'page-2-cursor',
      },
    );
    expect(result.current.activityEntries).toHaveLength(2);
  });

  it('does not loadMore when hasMore is false', async () => {
    const noMorePage = { ...MOCK_PAGE_1, has_more: false, cursor: null };
    mockCall.mockResolvedValueOnce(noMorePage as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('hydrates from Redux cache when local state is empty', async () => {
    const cached = [MOCK_ENTRY];
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedActivity: cached,
      isOptedIn: false,
    });

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.activityEntries).toEqual(cached);
    });
  });

  it('refresh resets and re-fetches first page', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PAGE_1 as never).mockResolvedValueOnce({
      results: [{ ...MOCK_ENTRY, usdAmount: '9999.000000' }],
      has_more: false,
      cursor: null,
    } as never);

    const { result } = renderHook(() =>
      useGetOndoCampaignActivity(CAMPAIGN_ID),
    );

    await waitFor(() => {
      expect(result.current.activityEntries).toHaveLength(1);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(result.current.activityEntries?.[0].usdAmount).toBe('9999.000000');
    expect(result.current.hasMore).toBe(false);
  });

  it('calls selectOndoCampaignActivityById with subscriptionId and campaignId', () => {
    renderHook(() => useGetOndoCampaignActivity(CAMPAIGN_ID));

    expect(mockSelectOndoCampaignActivityById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      CAMPAIGN_ID,
    );
  });
});
