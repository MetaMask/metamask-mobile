import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ActivityTab } from './ActivityTab';
import type { SeasonStatusState } from '../../../../../core/Engine/controllers/rewards-controller/types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selector
jest.mock('../../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { UsePointsEventsResult } from '../../hooks/usePointsEvents';
const mockSelectSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;

// Mock data
const mockSubscriptionId: string = 'sub-12345678';

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'rewards.loading_activity': 'Loading activity',
      'rewards.error_loading_activity': 'Error loading activity',
    };
    return t[key] || key;
  }),
}));

// Mock hooks used by ActivityTab
const mockUseSeasonStatus = jest.fn();
jest.mock('../../hooks/useSeasonStatus', () => ({
  useSeasonStatus: (...args: unknown[]) => mockUseSeasonStatus(...args),
}));

const mockUsePointsEvents = jest.fn();
jest.mock('../../hooks/usePointsEvents', () => ({
  usePointsEvents: (...args: unknown[]) => mockUsePointsEvents(...args),
}));

// Mock ActivityEventRow to simplify assertions
jest.mock('./ActivityEventRow', () => ({
  ActivityEventRow: ({ event }: { event: { id: string } }) => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ReactActual.createElement(Text, null, `event:${event.id}`);
  },
}));

describe('ActivityTab', () => {
  const defaultSeasonStatus: SeasonStatusState = {
    season: {
      id: 'season-1',
      name: 'Season 1',
      startDate: Date.now(),
      endDate: Date.now() + 1000,
      tiers: [],
    },
    balance: {
      total: 0,
      refereePortion: 0,
      updatedAt: Date.now(),
    },
    tier: {
      currentTier: { id: 'tier-1', name: 'Bronze', pointsNeeded: 0 },
      nextTier: null,
      nextTierPointsNeeded: null,
    },
  };

  const makePointsEventsResult = (
    overrides: Partial<UsePointsEventsResult> = {},
  ): UsePointsEventsResult => ({
    pointsEvents: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    error: null,
    loadMore: jest.fn(),
    refresh: jest.fn(),
    isRefreshing: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // useSelector calls the provided selector; mocked selectors return the configured value
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({} as unknown),
    );
    mockSelectSubscriptionId.mockReturnValue(mockSubscriptionId);

    mockUseSeasonStatus.mockReturnValue({
      seasonStatus: defaultSeasonStatus,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    mockUsePointsEvents.mockReturnValue(makePointsEventsResult());
  });

  it('renders loading state when loading and not refreshing', () => {
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({ isLoading: true, isRefreshing: false }),
    );

    const { getByText } = render(<ActivityTab />);
    expect(getByText('Loading activity')).toBeOnTheScreen();
  });

  it('renders error state when error occurs', () => {
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({ error: 'Network error' }),
    );

    const { getByText } = render(<ActivityTab />);
    expect(
      getByText('Error loading activity: Network error'),
    ).toBeOnTheScreen();
  });

  it('renders events', () => {
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [
          {
            id: 'e1',
            type: 'SWAP',
            timestamp: new Date(),
            payload: null,
            value: 10,
            bonus: null,
            accountAddress: null,
            accountId: 1,
            subscriptionId: mockSubscriptionId,
          },
          {
            id: 'e2',
            type: 'PERPS',
            timestamp: new Date(),
            payload: {
              type: 'OPEN_POSITION',
              token: { symbol: 'ETH', amount: 1000000, decimals: 1000000 },
              direction: 'LONG',
            },
            value: 20,
            bonus: null,
            accountAddress: null,
            accountId: 1,
            subscriptionId: mockSubscriptionId,
          },
        ],
      }),
    );

    const { getByText } = render(<ActivityTab />);
    expect(getByText('event:e1')).toBeOnTheScreen();
    expect(getByText('event:e2')).toBeOnTheScreen();
  });

  it('calls hooks with correct parameters', () => {
    render(<ActivityTab />);

    // useSeasonStatus called with subscription and seasonId='current'
    expect(mockUseSeasonStatus).toHaveBeenCalledWith({
      subscriptionId: mockSubscriptionId,
      seasonId: 'current',
    });

    // usePointsEvents called with derived seasonId and subscriptionId
    expect(mockUsePointsEvents).toHaveBeenCalledWith({
      seasonId: defaultSeasonStatus.season.id,
      subscriptionId: mockSubscriptionId,
    });
  });

  it('passes empty string subscriptionId to usePointsEvents when subscription is missing', () => {
    // Subscription becomes null
    mockSelectSubscriptionId.mockReturnValueOnce(null);
    render(<ActivityTab />);

    // Last call should reflect empty subscription id
    const lastCall =
      mockUsePointsEvents.mock.calls[mockUsePointsEvents.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      seasonId: defaultSeasonStatus.season.id,
      subscriptionId: '',
    });
  });

  it('passes undefined seasonId to usePointsEvents when seasonStatus is null', () => {
    mockUseSeasonStatus.mockReturnValueOnce({
      seasonStatus: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    render(<ActivityTab />);
    const lastCall =
      mockUsePointsEvents.mock.calls[mockUsePointsEvents.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      seasonId: undefined,
      subscriptionId: mockSubscriptionId,
    });
  });

  it('refreshes points events when refresh function is called', () => {
    const mockRefresh = jest.fn();
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [
          {
            id: 'e1',
            type: 'SWAP',
            timestamp: new Date(),
            payload: null,
            value: 10,
            bonus: null,
            accountAddress: null,
            accountId: 1,
            subscriptionId: mockSubscriptionId,
          },
        ],
        refresh: mockRefresh,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);
    const flatList = getByTestId('flatlist');
    flatList.props.onRefresh();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('loads more points events when loadMore function is called', () => {
    const mockLoadMore = jest.fn();
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [
          {
            id: 'e1',
            type: 'SWAP',
            timestamp: new Date(),
            payload: null,
            value: 10,
            bonus: null,
            accountAddress: null,
            accountId: 1,
            subscriptionId: mockSubscriptionId,
          },
        ],
        loadMore: mockLoadMore,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);
    const flatList = getByTestId('flatlist');
    flatList.props.onEndReached();

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading footer when loading more points events', () => {
    mockUsePointsEvents.mockReturnValueOnce(
      makePointsEventsResult({
        pointsEvents: [
          {
            id: 'e1',
            type: 'SWAP',
            timestamp: new Date(),
            payload: null,
            value: 10,
            bonus: null,
            accountAddress: null,
            accountId: 1,
            subscriptionId: mockSubscriptionId,
          },
        ],
        isLoadingMore: true,
      }),
    );

    const { getByTestId } = render(<ActivityTab />);

    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });
});
