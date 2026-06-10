import React from 'react';
import { SectionList, Text } from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import PredictTransactionsView from './PredictTransactionsView';
import {
  PredictActivityType,
  PredictPositionStatus,
  type PredictPosition,
} from '../../types';
import {
  getPredictPositionsHistoryListSelector,
  PredictPositionsHistoryListSelectorsIDs,
} from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PREDICT_TRANSACTIONS_VIEW_TEST_IDS } from './PredictTransactionsView.testIds';
import Engine from '../../../../../core/Engine';

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

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
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

  const createClaimPendingPosition = (
    overrides: Partial<PredictPosition> = {},
  ): PredictPosition => ({
    amount: 1,
    avgPrice: 0.5,
    cashPnl: 1,
    claimable: true,
    currentValue: 4.5,
    endDate: '2026-05-25T00:00:00.000Z',
    icon: 'https://example.com/icon.png',
    id: 'claimable-position',
    initialValue: 1,
    marketId: 'market-1',
    outcome: 'Yes',
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    outcomeTokenId: 'token-1',
    percentPnl: 350,
    price: 0.5,
    providerId: 'provider-1',
    size: 1,
    status: PredictPositionStatus.WON,
    title: 'Prediction market',
    ...overrides,
  });

  it('tracks activity viewed when the list becomes visible by default', () => {
    render(<PredictTransactionsView isVisible />);

    expect(
      Engine.context.PredictController.trackActivityViewed,
    ).toHaveBeenCalledWith({
      activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
    });
  });

  it('can defer visible-list analytics to the parent surface', () => {
    render(
      <PredictTransactionsView isVisible shouldTrackActivityViewed={false} />,
    );

    expect(
      Engine.context.PredictController.trackActivityViewed,
    ).not.toHaveBeenCalled();
  });

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

  it('keeps claim pending positions visible while activity data loads', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: true,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
      />,
    );

    expect(screen.getByText('Prediction won')).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ACTIVITY_INDICATOR,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('activity-indicator')).toBeNull();
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

  it('keeps claim pending positions visible with a retry path when initial activity request fails', async () => {
    const mockRefetch = jest.fn();
    const mockRefreshClaimPendingPositions = jest.fn();
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        error: new Error('Network error'),
        refetch: mockRefetch,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
        onClaimPendingPositionsRefresh={mockRefreshClaimPendingPositions}
      />,
    );

    expect(screen.getByText('Prediction won')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ERROR_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.ERROR_STATE),
    ).toBeNull();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_RETRY_BUTTON,
        ),
      );
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockRefreshClaimPendingPositions).toHaveBeenCalledTimes(1);
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

  it('does not show claim pending positions when the prop is omitted', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.queryByText('Claim pending')).toBeNull();
    expect(screen.getByText('No recent activity')).toBeOnTheScreen();
  });

  it('prepends claim pending positions before date-grouped history', () => {
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
        ],
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
      />,
    );

    const sectionList = screen.UNSAFE_getByType(SectionList);
    expect(sectionList.props.sections[0].title).toBe('Claim pending');
    expect(sectionList.props.sections[0].data[0].kind).toBe('claimPending');
    expect(
      screen.getByTestId(
        PredictPositionsHistoryListSelectorsIDs.CLAIM_PENDING_SECTION,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Prediction won')).toBeOnTheScreen();
    expect(screen.getByText('Prediction market')).toBeOnTheScreen();
    expect(screen.getByText('+$4.50')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-activity-a1')).toBeOnTheScreen();
  });

  it('shows the claim pending section when transaction history is empty', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
      />,
    );

    expect(
      screen.getByTestId(
        PredictPositionsHistoryListSelectorsIDs.CLAIM_PENDING_SECTION,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Claim pending')).toBeOnTheScreen();
    expect(screen.queryByText('No recent activity')).toBeNull();
  });

  it('uses unique test IDs for multiple claim pending positions', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[
          createClaimPendingPosition({ id: 'claimable-position-1' }),
          createClaimPendingPosition({ id: 'claimable-position-2' }),
        ]}
      />,
    );

    expect(
      screen.getByTestId(
        getPredictPositionsHistoryListSelector.claimPendingRow(
          'claimable-position-1',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        getPredictPositionsHistoryListSelector.claimPendingRow(
          'claimable-position-2',
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('hides claim pending amounts in privacy mode', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
        isPrivacyMode
      />,
    );

    expect(screen.getByText('Prediction won')).toBeOnTheScreen();
    expect(screen.queryByText('+$4.50')).toBeNull();
  });

  it('omits non-actionable claim pending positions', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[
          createClaimPendingPosition({
            currentValue: 0,
            id: 'lost-position',
            status: PredictPositionStatus.LOST,
            title: 'Lost prediction market',
          }),
          createClaimPendingPosition({
            currentValue: 0,
            id: 'zero-value-won-position',
            status: PredictPositionStatus.WON,
            title: 'Zero value won market',
          }),
        ]}
      />,
    );

    expect(screen.queryByText('Claim pending')).toBeNull();
    expect(screen.queryByText('Prediction lost')).toBeNull();
    expect(screen.queryByText('Lost prediction market')).toBeNull();
    expect(screen.queryByText('Zero value won market')).toBeNull();
    expect(
      screen.queryByTestId(
        getPredictPositionsHistoryListSelector.claimPendingRow('lost-position'),
      ),
    ).toBeNull();
    expect(screen.getByText('No recent activity')).toBeOnTheScreen();
  });

  it('navigates to market details when a claim pending position is pressed', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        data: [],
        isLoading: false,
      }),
    );

    render(
      <PredictTransactionsView
        claimPendingPositions={[createClaimPendingPosition()]}
      />,
    );

    const row = screen.getByTestId(
      getPredictPositionsHistoryListSelector.claimPendingRow(
        'claimable-position',
      ),
    );
    expect(row).toHaveProp('accessibilityRole', 'button');
    expect(row).toHaveProp(
      'accessibilityLabel',
      'Prediction won, Prediction market, opens market details',
    );

    fireEvent.press(row);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MARKET_DETAILS, {
      marketId: 'market-1',
      entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
    });
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

  it('passes refreshing state and triggers activity and claim pending refresh handlers on pull to refresh', async () => {
    const mockRefetch = jest.fn().mockResolvedValue(undefined);
    const mockRefreshClaimPendingPositions = jest
      .fn()
      .mockResolvedValue(undefined);
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

    render(
      <PredictTransactionsView
        onClaimPendingPositionsRefresh={mockRefreshClaimPendingPositions}
      />,
    );

    const sectionList = screen.UNSAFE_getByType(SectionList);
    expect(sectionList.props.refreshing).toBe(true);

    await act(async () => {
      await fireEvent(sectionList, 'refresh');
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockRefreshClaimPendingPositions).toHaveBeenCalledTimes(1);
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
    const mockRefreshClaimPendingPositions = jest.fn();
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

    render(
      <PredictTransactionsView
        onClaimPendingPositionsRefresh={mockRefreshClaimPendingPositions}
      />,
    );

    expect(
      screen.getByTestId(PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_ERROR_STATE),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        PREDICT_TRANSACTIONS_VIEW_TEST_IDS.FOOTER_RETRY_BUTTON,
      ),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockRefreshClaimPendingPositions).toHaveBeenCalledTimes(1);
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
