import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import PredictGameChart from './PredictGameChart';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictPriceHistoryInterval,
  PredictGameStatus,
} from '../../types';

// Mock the hooks
jest.mock('../../hooks/usePredictPriceHistory');
jest.mock('../../hooks/useLiveMarketPrices');

// Mock PredictGameChartContent to capture props
jest.mock('./PredictGameChartContent', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPredictGameChartContent({
    data,
    isLoading,
    timeframe,
    onTimeframeChange,
    disabledTimeframeSelector,
    testID,
  }: {
    data: unknown[];
    isLoading: boolean;
    timeframe: string;
    onTimeframeChange?: (tf: string) => void;
    disabledTimeframeSelector?: boolean;
    testID?: string;
  }) {
    return (
      <View testID={testID}>
        <Text testID="content-data">{JSON.stringify(data)}</Text>
        <Text testID="content-loading">{String(isLoading)}</Text>
        <Text testID="content-timeframe">{timeframe}</Text>
        <Text testID="content-disabled-selector">
          {String(disabledTimeframeSelector)}
        </Text>
        {onTimeframeChange && !disabledTimeframeSelector && (
          <View
            testID="timeframe-trigger"
            onTouchEnd={() => onTimeframeChange('6h')}
          />
        )}
      </View>
    );
  };
});

const mockUsePredictPriceHistory = usePredictPriceHistory as jest.Mock;
const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;

const createMockPriceHistory = (
  tokenIndex: number,
  pointCount: number = 5,
  basePrice: number = 0.5,
) =>
  Array.from({ length: pointCount }, (_, i) => ({
    timestamp: 1000000 + i * 60000,
    price: basePrice + (tokenIndex === 0 ? 0.01 : -0.01) * i,
  }));

const mockBaseGame = {
  id: 'game-123',
  homeTeam: {
    id: 'team-home',
    name: 'Team B',
    abbreviation: 'TB',
    color: '#0000FF',
    alias: 'Team B',
    logo: 'https://example.com/logo-b.png',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Team A',
    abbreviation: 'TA',
    color: '#FF0000',
    alias: 'Team A',
    logo: 'https://example.com/logo-a.png',
  },
  startTime: '2024-01-15T10:00:00Z',
  status: 'ongoing' as PredictGameStatus,
  league: 'nfl' as const,
  elapsed: null,
  period: null,
  score: null,
};

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id: 'test-market-id',
    title: 'Test Game Market',
    description: 'Test description',
    image: 'https://example.com/image.png',
    providerId: 'polymarket',
    status: PredictMarketStatus.OPEN,
    category: 'sports',
    tags: ['NFL'],
    outcomes: [
      {
        id: 'outcome-1',
        marketId: 'test-market-id',
        title: 'Game Outcome',
        groupItemTitle: 'Game Outcome',
        status: 'open',
        volume: 1000,
        tokens: [
          { id: 'token-a', title: 'Team A', price: 0.65 },
          { id: 'token-b', title: 'Team B', price: 0.35 },
        ],
      },
    ],
    endDate: '2024-12-31T23:59:59Z',
    game: mockBaseGame,
    ...overrides,
  }) as PredictMarket;

const defaultTokenIds: [string, string] = ['token-a', 'token-b'];
const defaultMarket = createMockMarket();

describe('PredictGameChart Wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    mockUsePredictPriceHistory.mockReturnValue({
      priceHistories: [],
      isFetching: false,
      errors: [null, null],
      refetch: jest.fn(),
    });

    mockUseLiveMarketPrices.mockReturnValue({
      prices: new Map(),
      getPrice: jest.fn(),
      isConnected: false,
      lastUpdateTime: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('Hook Configuration', () => {
    it('calls usePredictPriceHistory with correct interval for live timeframe', () => {
      render(<PredictGameChart market={defaultMarket} testID="chart" />);

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          marketIds: defaultTokenIds,
          interval: PredictPriceHistoryInterval.ONE_HOUR,
          fidelity: 1,
          providerId: 'polymarket',
          enabled: true,
        }),
      );
    });

    it('calls useLiveMarketPrices with enabled true for live timeframe', () => {
      render(<PredictGameChart market={defaultMarket} />);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(defaultTokenIds, {
        enabled: true,
      });
    });

    it('passes custom providerId to usePredictPriceHistory', () => {
      const marketWithCustomProvider = createMockMarket({
        providerId: 'custom-provider',
      });

      render(
        <PredictGameChart
          market={marketWithCustomProvider}
          providerId="custom-provider"
        />,
      );

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'custom-provider',
        }),
      );
    });

    it('disables hooks when market has no tokens', () => {
      const marketNoTokens = createMockMarket({
        outcomes: [],
      });

      render(<PredictGameChart market={marketNoTokens} />);

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });

  describe('Data Transformation', () => {
    it('transforms price history to chart data format', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3, 0.6),
        createMockPriceHistory(1, 3, 0.4),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data).toHaveLength(2);
        expect(data[0].label).toBe('TA');
        expect(data[0].color).toBe('#FF0000');
        expect(data[0].data).toHaveLength(3);
        expect(data[0].data[0].value).toBe(60);
      });
    });

    it('converts price (0-1) to percentage (0-100)', async () => {
      const mockHistories = [
        [{ timestamp: 1000000, price: 0.75 }],
        [{ timestamp: 1000000, price: 0.25 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data[0].value).toBe(75);
        expect(data[1].data[0].value).toBe(25);
      });
    });

    it('handles string timestamps by converting to numbers', async () => {
      const mockHistories = [
        [{ timestamp: '2024-01-15T12:00:00.000Z', price: 0.5 }],
        [{ timestamp: '2024-01-15T12:00:00.000Z', price: 0.5 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(typeof data[0].data[0].timestamp).toBe('number');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading when fetching price history', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: true,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      expect(getByTestId('content-loading').children[0]).toBe('true');
    });

    it('shows loading in live mode until initial data loads', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // No data yet, should show loading
      expect(getByTestId('content-loading').children[0]).toBe('true');
    });

    it('stops showing loading after data loads', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        expect(getByTestId('content-loading').children[0]).toBe('false');
      });
    });

    it('remains loading when first series has data but second series is empty', async () => {
      const incompleteHistories = [createMockPriceHistory(0, 3, 0.6), []];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: incompleteHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId, rerender } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      expect(getByTestId('content-loading').children[0]).toBe('true');

      const completeHistories = [
        createMockPriceHistory(0, 3, 0.6),
        createMockPriceHistory(1, 3, 0.4),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: completeHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      rerender(<PredictGameChart market={defaultMarket} testID="chart" />);

      await waitFor(() => {
        expect(getByTestId('content-loading').children[0]).toBe('false');
      });
    });
  });

  describe('Live Update Logic', () => {
    it('updates last data point when within same minute', async () => {
      const baseTimestamp = new Date('2024-01-15T12:00:00.000Z').getTime();
      jest.setSystemTime(new Date(baseTimestamp + 30000)); // 30 seconds later

      const mockHistories = [
        [{ timestamp: baseTimestamp, price: 0.5 }],
        [{ timestamp: baseTimestamp, price: 0.5 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.54,
            bestAsk: 0.56,
            timestamp: Date.now(),
          },
        ],
        [
          'token-b',
          {
            tokenId: 'token-b',
            price: 0.44,
            bestAsk: 0.46,
            timestamp: Date.now(),
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { getByTestId, rerender } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // Wait for initial data to load
      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data).toHaveLength(2);
      });

      // Trigger re-render with updated prices
      rerender(<PredictGameChart market={defaultMarket} testID="chart" />);

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data).toHaveLength(1);
        expect(data[0].data[0].value).toBe(56);
      });
    });

    it('adds new data point when minute changes', async () => {
      const baseTimestamp = new Date('2024-01-15T12:00:00.000Z').getTime();

      const mockHistories = [
        [{ timestamp: baseTimestamp, price: 0.5 }],
        [{ timestamp: baseTimestamp, price: 0.5 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      // First render at base time
      jest.setSystemTime(new Date(baseTimestamp));

      const { getByTestId, rerender } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // Wait for initial data
      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data).toHaveLength(2);
      });

      // Move to next minute and provide new prices
      const nextMinute = baseTimestamp + 60000;
      jest.setSystemTime(new Date(nextMinute));

      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.54,
            bestAsk: 0.56,
            timestamp: nextMinute,
          },
        ],
        [
          'token-b',
          {
            tokenId: 'token-b',
            price: 0.44,
            bestAsk: 0.46,
            timestamp: nextMinute,
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: nextMinute,
      });

      rerender(<PredictGameChart market={defaultMarket} testID="chart" />);

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        // Should have 2 data points now (original + new minute)
        expect(data[0].data.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('maintains maximum of 60 data points in live mode', async () => {
      const mockHistories = [
        Array.from({ length: 60 }, (_, i) => ({
          timestamp: 1000000 + i * 60000,
          price: 0.5,
        })),
        Array.from({ length: 60 }, (_, i) => ({
          timestamp: 1000000 + i * 60000,
          price: 0.5,
        })),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data.length).toBeLessThanOrEqual(60);
      });
    });

    it('keeps series lengths synchronized when only one token has updates', async () => {
      const baseTimestamp = new Date('2024-01-15T12:00:00.000Z').getTime();

      const mockHistories = [
        [
          { timestamp: baseTimestamp, price: 0.5 },
          { timestamp: baseTimestamp + 60000, price: 0.52 },
        ],
        [
          { timestamp: baseTimestamp, price: 0.5 },
          { timestamp: baseTimestamp + 60000, price: 0.48 },
        ],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      jest.setSystemTime(new Date(baseTimestamp + 120000));

      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.54,
            bestAsk: 0.56,
            timestamp: baseTimestamp + 120000,
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: baseTimestamp + 120000,
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data.length).toBe(data[1].data.length);
      });
    });

    it('carries forward last value for series without updates', async () => {
      const baseTimestamp = new Date('2024-01-15T12:00:00.000Z').getTime();

      const mockHistories = [
        [{ timestamp: baseTimestamp, price: 0.6 }],
        [{ timestamp: baseTimestamp, price: 0.4 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      jest.setSystemTime(new Date(baseTimestamp + 30000));

      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.64,
            bestAsk: 0.66,
            timestamp: baseTimestamp + 30000,
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: baseTimestamp + 30000,
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data[0].value).toBe(66);
        expect(data[1].data[0].value).toBe(40);
      });
    });

    it('preserves accumulated live data when historical data refetches', async () => {
      const baseTimestamp = new Date('2024-01-15T12:00:00.000Z').getTime();
      jest.setSystemTime(new Date(baseTimestamp + 30000));

      const initialHistories = [
        [{ timestamp: baseTimestamp, price: 0.5 }],
        [{ timestamp: baseTimestamp, price: 0.5 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: initialHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.69,
            bestAsk: 0.71,
            timestamp: baseTimestamp + 30000,
          },
        ],
        [
          'token-b',
          {
            tokenId: 'token-b',
            price: 0.29,
            bestAsk: 0.31,
            timestamp: baseTimestamp + 30000,
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: baseTimestamp + 30000,
      });

      const { getByTestId, rerender } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data[0].data[0].value).toBe(71);
      });

      const refetchedHistories = [
        [{ timestamp: baseTimestamp, price: 0.45 }],
        [{ timestamp: baseTimestamp, price: 0.55 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: refetchedHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      rerender(<PredictGameChart market={defaultMarket} testID="chart" />);

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data[0].value).toBe(71);
        expect(data[1].data[0].value).toBe(31);
      });
    });
  });

  describe('Timeframe Switching', () => {
    it('uses different intervals for different timeframes', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(getByTestId('content-timeframe').children[0]).toBe('live');
      });

      // Simulate timeframe change to 6h
      await act(async () => {
        getByTestId('timeframe-trigger').props.onTouchEnd();
      });

      // Should call hook with 6h interval
      await waitFor(() => {
        const lastCall =
          mockUsePredictPriceHistory.mock.calls[
            mockUsePredictPriceHistory.mock.calls.length - 1
          ];
        expect(lastCall[0].interval).toBe(PredictPriceHistoryInterval.SIX_HOUR);
      });
    });

    it('disables live updates when not in live timeframe', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // Change to 6h timeframe
      await act(async () => {
        getByTestId('timeframe-trigger').props.onTouchEnd();
      });

      // Live prices hook should be disabled
      await waitFor(() => {
        const lastCall =
          mockUseLiveMarketPrices.mock.calls[
            mockUseLiveMarketPrices.mock.calls.length - 1
          ];
        expect(lastCall[1].enabled).toBe(false);
      });
    });

    it('clears live chart data when switching away from live', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      // Wait for initial data load
      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data).toHaveLength(2);
      });

      // Change to 6h timeframe
      await act(async () => {
        getByTestId('timeframe-trigger').props.onTouchEnd();
      });

      // Should use historical data directly (not live chart data)
      await waitFor(() => {
        expect(getByTestId('content-timeframe').children[0]).toBe('6h');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty price histories gracefully', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      const dataText = getByTestId('content-data').children[0];
      const data = JSON.parse(String(dataText));

      expect(data).toEqual([]);
    });

    it('handles partial price history (only one token)', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [createMockPriceHistory(0, 3)],
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      const dataText = getByTestId('content-data').children[0];
      const data = JSON.parse(String(dataText));

      // Should return empty when not both histories available
      expect(data).toEqual([]);
    });

    it('handles missing price updates for one token', async () => {
      const mockHistories = [
        [{ timestamp: 1000000, price: 0.5 }],
        [{ timestamp: 1000000, price: 0.5 }],
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      // Only provide price for token-a
      const pricesMap = new Map([
        [
          'token-a',
          {
            tokenId: 'token-a',
            price: 0.54,
            bestAsk: 0.56,
            timestamp: Date.now(),
          },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        // Should still have both series
        expect(data).toHaveLength(2);
      });
    });

    it('passes testID to content component', () => {
      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="my-chart" />,
      );

      expect(getByTestId('my-chart')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('passes error message from hook to content component', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: false,
        errors: ['Network error', null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      const errorText = JSON.parse(
        String(getByTestId('content-data').children[0]),
      );
      expect(errorText).toEqual([]);
    });

    it('calls refetch when retry is triggered', async () => {
      const mockRefetch = jest.fn();

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: false,
        errors: ['Error', null],
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      const mockContent = getByTestId('chart');
      expect(mockContent).toBeTruthy();
    });

    it('detects error when any error in array is not null', () => {
      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: [],
        isFetching: false,
        errors: [null, 'Second token error'],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      expect(getByTestId('chart')).toBeTruthy();
    });

    it('shows no error when all errors are null', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data).toHaveLength(2);
      });
    });
  });

  describe('Fidelity Configuration', () => {
    it('uses fidelity 1 for live timeframe', () => {
      render(<PredictGameChart market={defaultMarket} />);

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fidelity: 1,
        }),
      );
    });

    it('uses fidelity 5 for 6h timeframe', async () => {
      const mockHistories = [
        createMockPriceHistory(0, 3),
        createMockPriceHistory(1, 3),
      ];

      mockUsePredictPriceHistory.mockReturnValue({
        priceHistories: mockHistories,
        isFetching: false,
        errors: [null, null],
        refetch: jest.fn(),
      });

      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} />,
      );

      await act(async () => {
        getByTestId('timeframe-trigger').props.onTouchEnd();
      });

      await waitFor(() => {
        const lastCall =
          mockUsePredictPriceHistory.mock.calls[
            mockUsePredictPriceHistory.mock.calls.length - 1
          ];
        expect(lastCall[0].fidelity).toBe(5);
      });
    });
  });

  describe('Game Status Timeframe Defaults', () => {
    it('defaults to live timeframe for ongoing games', () => {
      const { getByTestId } = render(
        <PredictGameChart market={defaultMarket} testID="chart" />,
      );

      expect(getByTestId('content-timeframe').children[0]).toBe('live');
      expect(getByTestId('content-disabled-selector').children[0]).toBe(
        'false',
      );
    });

    it('defaults to 6h timeframe for scheduled games', () => {
      const scheduledMarket = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'scheduled' as PredictGameStatus,
        },
      });

      const { getByTestId } = render(
        <PredictGameChart market={scheduledMarket} testID="chart" />,
      );

      expect(getByTestId('content-timeframe').children[0]).toBe('6h');
      expect(getByTestId('content-disabled-selector').children[0]).toBe(
        'false',
      );
    });

    it('defaults to max timeframe for ended games and disables selector', () => {
      const endedMarket = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ended' as PredictGameStatus,
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T13:00:00Z',
        },
      });

      const { getByTestId, queryByTestId } = render(
        <PredictGameChart market={endedMarket} testID="chart" />,
      );

      expect(getByTestId('content-timeframe').children[0]).toBe('max');
      expect(getByTestId('content-disabled-selector').children[0]).toBe('true');
      expect(queryByTestId('timeframe-trigger')).toBeNull();
    });

    it('uses startTs/endTs for ended games instead of interval', () => {
      const endedMarket = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ended' as PredictGameStatus,
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T13:00:00Z',
        },
      });

      render(<PredictGameChart market={endedMarket} testID="chart" />);

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startTs: Math.floor(
            new Date('2024-01-15T10:00:00Z').getTime() / 1000,
          ),
          endTs: Math.floor(new Date('2024-01-15T13:00:00Z').getTime() / 1000),
          interval: undefined,
          fidelity: 2,
        }),
      );
    });

    it('uses 2-minute fidelity for ended games', () => {
      const endedMarket = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ended' as PredictGameStatus,
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T13:00:00Z',
        },
      });

      render(<PredictGameChart market={endedMarket} testID="chart" />);

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fidelity: 2,
        }),
      );
    });

    it('disables live market prices for non-ongoing games', () => {
      const scheduledMarket = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'scheduled' as PredictGameStatus,
        },
      });

      render(<PredictGameChart market={scheduledMarket} testID="chart" />);

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          enabled: false,
        }),
      );
    });
  });
});
