import React from 'react';
import { SectionList } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import PredictTransactionsView from './PredictTransactionsView';
import { PredictActivityType } from '../../types';

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
    isLoading: false,
    isRefreshing: false,
    loadActivity: jest.fn(),
  })),
}));

const { usePredictActivity } = jest.requireMock(
  '../../hooks/usePredictActivity',
);

describe('PredictTransactionsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createUsePredictActivityValue = (
    overrides: Partial<{
      activity: unknown[];
      isLoading: boolean;
      isRefreshing: boolean;
      loadActivity: jest.Mock;
    }> = {},
  ) => ({
    activity: [],
    isLoading: false,
    isRefreshing: false,
    loadActivity: jest.fn(),
    ...overrides,
  });

  it('displays loading indicator when activity data loads', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        activity: [],
        isLoading: true,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('displays empty state message when activity list is empty', () => {
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        activity: [],
        isLoading: false,
      }),
    );

    render(<PredictTransactionsView />);

    expect(screen.getByText('No recent activity')).toBeOnTheScreen();
  });

  it('displays all activity items from the activity list', () => {
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isLoading: false,
        activity: [
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
        activity: [
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
        activity: [
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
        activity: [
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
        activity: [
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
        activity: [
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
    const mockLoadActivity = jest.fn().mockResolvedValue(undefined);
    const mockTimestamp = Math.floor(Date.now() / 1000);
    (usePredictActivity as jest.Mock).mockReturnValueOnce(
      createUsePredictActivityValue({
        isRefreshing: true,
        loadActivity: mockLoadActivity,
        activity: [
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
      await sectionList.props.onRefresh();
    });

    expect(mockLoadActivity).toHaveBeenCalledWith({ isRefresh: true });
  });
});
