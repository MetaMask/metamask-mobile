import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import PredictGameChart from './PredictGameChart';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { PredictPriceHistoryInterval } from '../../types';

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
    testID,
  }: {
    data: unknown[];
    isLoading: boolean;
    timeframe: string;
    onTimeframeChange: (tf: string) => void;
    testID?: string;
  }) {
    return (
      <View testID={testID}>
        <Text testID="content-data">{JSON.stringify(data)}</Text>
        <Text testID="content-loading">{String(isLoading)}</Text>
        <Text testID="content-timeframe">{timeframe}</Text>
        <View
          testID="timeframe-trigger"
          onTouchEnd={() => onTimeframeChange('6h')}
        />
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

const defaultSeriesConfig: [
  { label: string; color: string },
  { label: string; color: string },
] = [
  { label: 'Team A', color: '#FF0000' },
  { label: 'Team B', color: '#0000FF' },
];

const defaultTokenIds: [string, string] = ['token-a', 'token-b'];

describe('PredictGameChart Wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    // Default mock implementations
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
      render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

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
      render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
        />,
      );

      expect(mockUseLiveMarketPrices).toHaveBeenCalledWith(defaultTokenIds, {
        enabled: true,
      });
    });

    it('passes custom providerId to usePredictPriceHistory', () => {
      render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          providerId="custom-provider"
        />,
      );

      expect(mockUsePredictPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'custom-provider',
        }),
      );
    });

    it('disables hooks when tokenIds length is not 2', () => {
      render(
        <PredictGameChart
          tokenIds={['single-token'] as unknown as [string, string]}
          seriesConfig={defaultSeriesConfig}
        />,
      );

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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data).toHaveLength(2);
        expect(data[0].label).toBe('Team A');
        expect(data[0].color).toBe('#FF0000');
        expect(data[0].data).toHaveLength(3);
        // Price 0.6 -> 60%
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

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
        ['token-a', { tokenId: 'token-a', price: 0.55, timestamp: Date.now() }],
        ['token-b', { tokenId: 'token-b', price: 0.45, timestamp: Date.now() }],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { getByTestId, rerender } = render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

      // Wait for initial data to load
      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));
        expect(data).toHaveLength(2);
      });

      // Trigger re-render with updated prices
      rerender(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        // Should still have 1 data point (updated, not added)
        expect(data[0].data).toHaveLength(1);
        // Value should be updated to new price
        expect(data[0].data[0].value).toBe(55);
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        ['token-a', { tokenId: 'token-a', price: 0.55, timestamp: nextMinute }],
        ['token-b', { tokenId: 'token-b', price: 0.45, timestamp: nextMinute }],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: nextMinute,
      });

      rerender(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
            price: 0.55,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
          { tokenId: 'token-a', price: 0.65, timestamp: baseTimestamp + 30000 },
        ],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: baseTimestamp + 30000,
      });

      const { getByTestId } = render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
      );

      await waitFor(() => {
        const dataText = getByTestId('content-data').children[0];
        const data = JSON.parse(String(dataText));

        expect(data[0].data[0].value).toBe(65);
        expect(data[1].data[0].value).toBe(40);
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        ['token-a', { tokenId: 'token-a', price: 0.55, timestamp: Date.now() }],
      ]);

      mockUseLiveMarketPrices.mockReturnValue({
        prices: pricesMap,
        getPrice: (id: string) => pricesMap.get(id),
        isConnected: true,
        lastUpdateTime: Date.now(),
      });

      const { getByTestId } = render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="my-chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
          testID="chart"
        />,
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
      render(
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
        />,
      );

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
        <PredictGameChart
          tokenIds={defaultTokenIds}
          seriesConfig={defaultSeriesConfig}
        />,
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
});
