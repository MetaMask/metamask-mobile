import React from 'react';
import { SectionList, Text } from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import PredictTransactionsView from './PredictTransactionsView';
import { PredictActivityType } from '../../types';
import { PREDICT_TRANSACTIONS_VIEW_TEST_IDS } from './PredictTransactionsView.testIds';

/**
 * Mock Strategy:
 * - Only mock custom hooks and child components with complex dependencies
 * - Do NOT mock: Routes, design system, icons, or i18n
 * - Child components are mocked because they have their own test coverage
 * and we're testing the parent's data transformation and rendering logic
 */

// Type for activity items passed to PredictActivity component
interface MockActivityItem {
  id: string;
  type: string;
  marketTitle: string;
  icon?: string;
  amountUsd: number;
  detail: string;
}

// Mock performance measurement hook
jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

// Mock Engine for analytics tracking
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackActivityViewed: jest.fn(),
    },
  },
}));

// Mock PredictActivity child component - has its own test coverage
const mockRenderItem: jest.Mock = jest.fn();

jest.mock('../../components/PredictActivity/PredictActivity', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View: RNView } = jest.requireActual('react-native');
  const MockedPredictActivityType = {
    BUY: 'BUY',
    SELL: 'SELL',
    CLAIM: 'CLAIM',
  };
  const MockComponent = ({
    item,
  }: {
    item: { id: string; detail: string };
  }) => {
    mockRenderItem(item);
    return ReactActual.createElement(
      RNView,
      { testID: `predict-activity-${item.id}` },
      ReactActual.createElement(RNText, null, item.detail),
    );
  };
  return {
    __esModule: true,
    default: MockComponent,
    PredictActivityType: MockedPredictActivityType,
  };
});

// Mock usePredictActivity hook - external data dependency
jest.mock('../../hooks/usePredictActivity', () => ({
  usePredictActivity: jest.fn(() => ({
    activity: [],
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  })),
}));

const { usePredictActivity } = jest.requireMock(
  '../../hooks/usePredictActivity',
);

describe('PredictTransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createUsePredictActivityValue = (
    overrides: Partial<{
      activity: unknown[];
      data: unknown[];
      error: Error | null;
      isLoading: boolean;
      isFetching: boolean;
      isRefetching: boolean;
      isFetchingNextPage: boolean;
      hasNextPage: boolean;
      fetchNextPage: jest.Mock;
      refetch: jest.Mock;
    }> = {},
  ) => {
    const data = overrides.data ?? overrides.activity ?? [];
    const activity = overrides.activity ?? data;

    return {
      error: null,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      ...overrides,
      activity,
      data,
    };
  };

  it('displays loading indicator when activity data loads', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: true,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('displays empty state message when activity list is empty', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByText('No recent activity')).toBeOnTheScreen();
  });

  it('displays retryable error state when initial activity request fails', async () => {
    const mockRefetch = jest.fn();
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        error: new Error('Network error'),
        refetch: mockRefetch,
      }),
    );

    render(<PredictTransactionsView />);

    expect(
      screen.getByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.ERROR_STATE),
    ).toBeOnTheScreen();
    expect(screen.queryByText('No recent activity')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('displays loading feedback while retrying an initial activity error', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        error: new Error('Network error'),
        isFetching: true,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.ERROR_STATE),
    ).toBeNull();
  });

  it('displays a custom empty state when provided', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        emptyState={<Text testID="custom-empty-state">Custom empty</Text>}
      />,
    );

    expect(screen.getByTestId('custom-empty-state')).toBeOnTheScreen();
    expect(screen.queryByText('No recent activity')).toBeNull();
  });

  it('displays all activity items from the activity list', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        data: [
          {
            id: 'a1',
            title: 'Market A',
            outcome: 'Yes',
            icon: 'https://example.com/a.png',
            entry: {
              type: 'buy',
              amount: 50,
              price: 0.34,
              timestamp: mockTimestamp,
            },
          },
          {
            id: 'b2',
            title: 'Market B',
            outcome: 'No',
            icon: 'https://example.com/b.png',
            entry: {
              type: 'sell',
              amount: 12.3,
              price: 0.7,
              timestamp: mockTimestamp - 100,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByTestId('predict-activity-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-activity-b2')).toBeOnTheScreen();
  });

  it('transforms buy activity entry into BUY activity item with formatted details', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        data: [
          {
            id: 'a1',
            title: 'Market A',
            outcome: 'Yes',
            icon: 'https://example.com/a.png',
            entry: {
              type: 'buy',
              amount: 50,
              price: 0.34,
              timestamp: mockTimestamp,
              marketId: 'market-a',
              outcomeId: 'outcome-yes',
              outcomeTokenId: 1,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    const calls = mockRenderItem.mock.calls.map(
      (c: [unknown]) => c[0] as MockActivityItem,
    );
    const buyItem = calls.find((i: MockActivityItem) => i.id === 'a1');

    expect(buyItem).toBeDefined();
    expect(buyItem?.type).toBe(PredictActivityType.BUY);
    expect(buyItem?.marketTitle).toBe('Market A');
    expect(buyItem?.icon).toBe('https://example.com/a.png');
    expect(buyItem?.amountUsd).toBe(50);
    expect(buyItem?.detail).toBe('Bought 50 on Yes · 34¢ per share');
  });

  it('transforms sell activity entry into SELL activity item with formatted price', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        data: [
          {
            id: 'b2',
            title: 'Market B',
            outcome: 'No',
            icon: 'https://example.com/b.png',
            entry: {
              type: 'sell',
              amount: 12.3,
              price: 0.7,
              timestamp: mockTimestamp - 100,
              marketId: 'market-b',
              outcomeId: 'outcome-no',
              outcomeTokenId: 2,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    const calls = mockRenderItem.mock.calls.map(
      (c: [unknown]) => c[0] as MockActivityItem,
    );
    const sellItem = calls.find((i: MockActivityItem) => i.id === 'b2');

    expect(sellItem).toBeDefined();
    expect(sellItem?.type).toBe(PredictActivityType.SELL);
    expect(sellItem?.marketTitle).toBe('Market B');
    expect(sellItem?.amountUsd).toBe(12.3);
    expect(sellItem?.detail).toBe('Sold at 70¢ per share');
  });

  it('transforms claimWinnings activity entry into CLAIM activity item', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        data: [
          {
            id: 'c3',
            title: 'Market C',
            outcome: 'Yes',
            icon: 'https://example.com/c.png',
            entry: {
              type: 'claimWinnings',
              amount: 99.99,
              timestamp: mockTimestamp - 200,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    const calls = mockRenderItem.mock.calls.map(
      (c: [unknown]) => c[0] as MockActivityItem,
    );
    const claimItem = calls.find((i: MockActivityItem) => i.id === 'c3');

    expect(claimItem).toBeDefined();
    expect(claimItem?.type).toBe(PredictActivityType.CLAIM);
    expect(claimItem?.marketTitle).toBe('Market C');
    expect(claimItem?.amountUsd).toBe(99.99);
    expect(claimItem?.detail).toBe('Claimed winnings');
  });

  it('transforms unknown activity type into CLAIM activity item with zero amount', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        data: [
          {
            id: 'd4',
            title: 'Market D',
            outcome: 'Yes',
            icon: 'https://example.com/d.png',
            entry: {
              type: 'unknown',
              amount: 1.23,
              timestamp: mockTimestamp - 300,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    const calls = mockRenderItem.mock.calls.map(
      (c: [unknown]) => c[0] as MockActivityItem,
    );
    const defaultItem = calls.find((i: MockActivityItem) => i.id === 'd4');

    expect(defaultItem).toBeDefined();
    expect(defaultItem?.type).toBe(PredictActivityType.CLAIM);
    expect(defaultItem?.marketTitle).toBe('Market D');
    expect(defaultItem?.amountUsd).toBe(0);
    expect(defaultItem?.detail).toBe('Claimed winnings');
  });

  it('keeps rendered items visible during background refreshes', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: true,
        data: [
          {
            id: 'refreshing-item',
            title: 'Market Refresh',
            outcome: 'Yes',
            entry: {
              type: 'buy',
              amount: 10,
              price: 0.5,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.queryByTestId('activity-indicator')).toBeNull();
    expect(
      screen.getByTestId('predict-activity-refreshing-item'),
    ).toBeOnTheScreen();
  });

  it('passes refreshing state and triggers refresh handler on pull to refresh', async () => {
    const mockRefetch = jest.fn().mockResolvedValue(undefined);
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isRefetching: true,
        refetch: mockRefetch,
        data: [
          {
            id: 'refreshable',
            title: 'Market Refreshable',
            outcome: 'Yes',
            entry: {
              type: 'sell',
              amount: 5,
              price: 0.4,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    const sectionList = screen.UNSAFE_getByType(SectionList);
    expect(sectionList.props.refreshing).toBe(true);

    await act(async () => {
      await fireEvent(sectionList, 'refresh');
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('fetches next activity page when the list end is reached', () => {
    const mockFetchNextPage = jest.fn();
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        hasNextPage: true,
        fetchNextPage: mockFetchNextPage,
        data: [
          {
            id: 'pageable',
            title: 'Market Pageable',
            outcome: 'Yes',
            entry: {
              type: 'buy',
              amount: 10,
              price: 0.5,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    fireEvent(screen.UNSAFE_getByType(SectionList), 'endReached');

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it.each([
    { hasNextPage: false, isFetchingNextPage: false },
    { hasNextPage: true, isFetchingNextPage: true },
  ])(
    'does not fetch next activity page when pagination is guarded: %p',
    ({ hasNextPage, isFetchingNextPage }) => {
      const mockFetchNextPage = jest.fn();
      const mockTimestamp = Math.floor(Date.now() / 1000);
      (usePredictActivity as jest.Mock).mockReturnValueOnce(
        createUsePredictActivityValue({
          hasNextPage,
          isFetchingNextPage,
          fetchNextPage: mockFetchNextPage,
          data: [
            {
              id: 'guarded',
              title: 'Market Guarded',
              outcome: 'Yes',
              entry: {
                type: 'buy',
                amount: 10,
                price: 0.5,
                timestamp: mockTimestamp,
              },
            },
          ],
        }),
      );

      render(<PredictTransactionsView />);

      fireEvent(screen.UNSAFE_getByType(SectionList), 'endReached');

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    },
  );

  it('displays footer loader while fetching the next activity page', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isFetchingNextPage: true,
        data: [
          {
            id: 'loading-more',
            title: 'Market Loading More',
            outcome: 'Yes',
            entry: {
              type: 'buy',
              amount: 10,
              price: 0.5,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    expect(
      screen.getByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ACTIVITY_INDICATOR,
      ),
    ).toBeOnTheScreen();
  });

  it('displays a footer retry state when a later activity page fails', () => {
    const mockFetchNextPage = jest.fn();
    const mockRefetch = jest.fn();
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        error: new Error('Next page failed'),
        hasNextPage: true,
        fetchNextPage: mockFetchNextPage,
        refetch: mockRefetch,
        data: [
          {
            id: 'loaded-before-error',
            title: 'Market Loaded',
            outcome: 'Yes',
            entry: {
              type: 'buy',
              amount: 10,
              price: 0.5,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    expect(
      screen.getByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ERROR_STATE),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_RETRY_BUTTON,
      ),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('displays footer loading feedback while retrying a later activity page error', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        error: new Error('Next page failed'),
        hasNextPage: true,
        isRefetching: true,
        data: [
          {
            id: 'loaded-before-retry',
            title: 'Market Loaded',
            outcome: 'Yes',
            entry: {
              type: 'buy',
              amount: 10,
              price: 0.5,
              timestamp: mockTimestamp,
            },
          },
        ],
      }),
    );

    render(<PredictTransactionsView />);

    expect(
      screen.getByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ACTIVITY_INDICATOR,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ERROR_STATE,
      ),
    ).toBeNull();
  });
});
