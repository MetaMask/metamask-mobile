import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PriceAdvanced, { type PriceAdvancedProps } from './Price.advanced';
import type { TokenI } from '../../Tokens/types';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockSetIsChartBeingTouched = jest.fn();
jest.mock('../PriceChart/PriceChart.context', () => ({
  usePriceChart: () => ({
    isChartBeingTouched: false,
    setIsChartBeingTouched: mockSetIsChartBeingTouched,
  }),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn(() => 2), // ChartType.Line = 2
    useDispatch: jest.fn(() => jest.fn()),
  };
});

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  const MockSkeleton = ({ children }: { children: React.ReactNode }) => (
    <View testID="skeleton-placeholder">{children}</View>
  );
  MockSkeleton.Item = (props: Record<string, unknown>) => <View {...props} />;
  return MockSkeleton;
});

jest.mock('../../Charts/AdvancedChart/AdvancedChart', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <View testID="mock-advanced-chart" {...props} />
    ),
  };
});

jest.mock('../../Charts/AdvancedChart/OHLCVBar/OHLCVBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    OHLCVBar: () => <View testID="mock-ohlcv-bar" />,
  };
});

const mockUseOHLCVChart = jest.fn().mockReturnValue({
  ohlcvData: [
    { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
  ],
  isLoading: false,
  error: undefined,
  hasMore: false,
  nextCursor: null,
});

jest.mock('../../Charts/AdvancedChart/useOHLCVChart', () => ({
  useOHLCVChart: (...args: unknown[]) => mockUseOHLCVChart(...args),
}));

jest.mock('../../Charts/AdvancedChart/TimeRangeSelector', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View, Pressable, Text } = require('react-native');
  const MockSelector = ({
    onSelect,
    onChartTypeToggle,
  }: {
    onSelect: (r: string) => void;
    onChartTypeToggle?: () => void;
  }) => (
    <View testID="mock-time-range-selector">
      <Pressable testID="select-1W" onPress={() => onSelect('1W')} />
      <Pressable testID="select-1D" onPress={() => onSelect('1D')} />
      {onChartTypeToggle && (
        <Pressable testID="toggle-chart-type" onPress={onChartTypeToggle}>
          <Text>Toggle</Text>
        </Pressable>
      )}
    </View>
  );
  return {
    __esModule: true,
    default: MockSelector,
    TIME_RANGE_CONFIGS: {
      '1H': { timePeriod: '1h', durationMs: 60 * 60 * 1000 },
      '1D': { timePeriod: '1d', durationMs: 24 * 60 * 60 * 1000 },
      '1W': { timePeriod: '1w', durationMs: 7 * 24 * 60 * 60 * 1000 },
      '1M': { timePeriod: '1m', durationMs: 30 * 24 * 60 * 60 * 1000 },
      '1Y': { timePeriod: '1y', durationMs: 365 * 24 * 60 * 60 * 1000 },
    },
  };
});

const mockAsset: TokenI = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: '0x1',
  name: 'Test Token',
  symbol: 'TST',
  ticker: 'TST',
  decimals: 18,
  image: '',
  balance: '0',
  logo: undefined,
  isETH: false,
};

const baseProps: PriceAdvancedProps = {
  asset: mockAsset,
  currentPrice: 105,
  currentCurrency: 'USD',
  isLoading: false,
};

describe('PriceAdvanced', () => {
  let mockTrackEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const analyticsHook = createMockUseAnalyticsHook({
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    });
    mockTrackEvent = analyticsHook.trackEvent as jest.Mock;
    jest.mocked(useAnalytics).mockReturnValue(analyticsHook);
  });

  it('renders the token price when not loading', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
    expect(
      getByTestId(TokenOverviewSelectorsIDs.TOKEN_PRICE),
    ).toBeOnTheScreen();
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} isLoading />);
    expect(getByTestId('loading-price-diff')).toBeOnTheScreen();
  });

  it('does not show header skeletons when only chart is loading', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: true,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });
    const { queryByTestId } = render(<PriceAdvanced {...baseProps} />);
    expect(queryByTestId('loading-price-diff')).not.toBeOnTheScreen();
  });

  it('does not render token price when currentPrice is NaN', () => {
    const { queryByTestId } = render(
      <PriceAdvanced {...baseProps} currentPrice={NaN} />,
    );
    expect(
      queryByTestId(TokenOverviewSelectorsIDs.TOKEN_PRICE),
    ).not.toBeOnTheScreen();
  });

  it('renders the AdvancedChart when data is available', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
    expect(getByTestId('mock-advanced-chart')).toBeOnTheScreen();
  });

  it('renders TimeRangeSelector when chart has data', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
    expect(getByTestId('mock-time-range-selector')).toBeOnTheScreen();
  });

  it('shows no-data overlay when ohlcvData is empty and chart not loading', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });
    const { getByTestId, queryByTestId } = render(
      <PriceAdvanced {...baseProps} />,
    );

    expect(getByTestId('price-chart-no-data')).toBeOnTheScreen();
    expect(queryByTestId('mock-advanced-chart')).not.toBeOnTheScreen();
    expect(queryByTestId('mock-time-range-selector')).not.toBeOnTheScreen();
  });

  it('shows insufficient-data overlay when only 1 data point', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-chart-insufficient-data')).toBeOnTheScreen();
  });

  it('shows no-data overlay on chart error', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
        { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
      ],
      isLoading: false,
      error: new Error('fetch failed'),
      hasMore: false,
      nextCursor: null,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-chart-no-data')).toBeOnTheScreen();
  });

  it('tracks CHART_EMPTY_DISPLAYED when empty state is shown', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });
    render(<PriceAdvanced {...baseProps} />);

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks chart_interacted with timeframe_changed when a different time range is selected', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('select-1W'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'chart_interacted',
        properties: expect.objectContaining({
          interaction_type: 'timeframe_changed',
          chart_timeframe: '1W',
        }),
      }),
    );
  });

  it('does not track when selecting the already-active time range', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('select-1D'));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks chart_interacted with chart_type_changed when chart type is toggled', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('toggle-chart-type'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'chart_interacted',
        properties: expect.objectContaining({
          interaction_type: 'chart_type_changed',
          chart_type: expect.stringMatching(/^(candlestick|line)$/),
        }),
      }),
    );
  });

  it('passes correct OHLCV hook params based on selected time range', () => {
    render(<PriceAdvanced {...baseProps} />);

    expect(mockUseOHLCVChart).toHaveBeenCalledWith(
      expect.objectContaining({
        timePeriod: '1d',
        vsCurrency: 'USD',
      }),
    );
  });

  it('re-fetches with new params after time range change', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
    mockUseOHLCVChart.mockClear();

    act(() => {
      fireEvent.press(getByTestId('select-1W'));
    });

    expect(mockUseOHLCVChart).toHaveBeenCalledWith(
      expect.objectContaining({
        timePeriod: '1w',
      }),
    );
  });

  it('renders price-label with the time range date label', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('calculates percentage from OHLCV close price of the reference candle', () => {
    // Reference candle close = 100, current price = 105
    // Expected: (105 - 100) / 100 * 100 = 5.00%
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        {
          time: oneDayAgo,
          open: 95,
          high: 101,
          low: 94,
          close: 100,
          volume: 1,
        },
        {
          time: now - 1000,
          open: 100,
          high: 106,
          low: 100,
          close: 105,
          volume: 1,
        },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    const { getByText } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    // Uses close (100) not open (95) — matches what the line chart visually draws
    expect(getByText(/5\.00%/)).toBeOnTheScreen();
  });

  it('hides price diff when OHLCV data is empty', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    const { queryByTestId } = render(<PriceAdvanced {...baseProps} />);

    // Should not render price-label when no OHLCV data
    expect(queryByTestId('price-label')).not.toBeOnTheScreen();
  });

  it('updates percentage when time range changes and new OHLCV data loads', () => {
    // Initial: reference candle close = 100, current price = 105
    // Expected: (105 - 100) / 100 * 100 = 5.00%
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        {
          time: oneDayAgo,
          open: 95,
          high: 101,
          low: 94,
          close: 100,
          volume: 1,
        },
        {
          time: now - 1000,
          open: 100,
          high: 106,
          low: 100,
          close: 105,
          volume: 1,
        },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    const { getByText, rerender } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    expect(getByText(/5\.00%/)).toBeOnTheScreen();

    // After time range change: reference candle close = 103, current = 105
    // Expected: (105 - 103) / 103 * 100 = 1.94%
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        {
          time: oneDayAgo,
          open: 102,
          high: 104,
          low: 102,
          close: 103,
          volume: 1,
        },
        {
          time: now - 1000,
          open: 103,
          high: 106,
          low: 103,
          close: 105,
          volume: 1,
        },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    rerender(<PriceAdvanced {...baseProps} currentPrice={105} />);

    expect(getByText(/1\.94%/)).toBeOnTheScreen();
  });

  it('displays price diff when dynamicComparePrice is 0', () => {
    // Edge case: reference candle close is 0 — should still render, not hide
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        {
          time: oneDayAgo,
          open: 0,
          high: 1,
          low: 0,
          close: 0,
          volume: 1,
        },
        {
          time: now - 1000,
          open: 0.5,
          high: 10,
          low: 0.5,
          close: 10,
          volume: 1,
        },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    const { getByText, getByTestId } = render(
      <PriceAdvanced {...baseProps} currentPrice={10} />,
    );

    expect(getByText(/\+\$10\.00/)).toBeOnTheScreen();
    // Division by zero guard shows 0% instead of Infinity
    expect(getByText(/0%/)).toBeOnTheScreen();
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('skips pre-visible candles when API returns extra history', () => {
    // Simulates: API returns 4 days of data for 1D range.
    // visibleFromMs = lastBar.time - 24h ≈ yesterday 15:00.
    // Candles before that should be ignored.
    const lastBarTime = Date.now() - 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        // 3 days ago — before visible range, should be skipped
        {
          time: lastBarTime - 3 * oneDayMs,
          open: 200,
          high: 210,
          low: 190,
          close: 200,
          volume: 1,
        },
        // 2 days ago — still before visible range, should be skipped
        {
          time: lastBarTime - 2 * oneDayMs,
          open: 190,
          high: 195,
          low: 185,
          close: 190,
          volume: 1,
        },
        // ~24h ago — first candle in visible range (close = 100)
        {
          time: lastBarTime - oneDayMs + 1000,
          open: 95,
          high: 101,
          low: 94,
          close: 100,
          volume: 1,
        },
        // Recent candle
        {
          time: lastBarTime,
          open: 103,
          high: 106,
          low: 103,
          close: 105,
          volume: 1,
        },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
    });

    const { getByText } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    // Should use close=100 from the first visible candle, NOT close=200 from 3 days ago
    // (105 - 100) / 100 * 100 = 5.00%
    expect(getByText(/5\.00%/)).toBeOnTheScreen();
  });

  describe('touch gesture handling', () => {
    it('sets isChartBeingTouched to true on touch start', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const chartContainer = getByTestId('advanced-chart-touch-container');

      fireEvent(chartContainer, 'touchStart');

      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(true);
    });

    it('sets isChartBeingTouched to false on touch end', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const chartContainer = getByTestId('advanced-chart-touch-container');

      fireEvent(chartContainer, 'touchStart');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(true);

      fireEvent(chartContainer, 'touchEnd');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(false);
    });

    it('sets isChartBeingTouched to false on touch cancel', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const chartContainer = getByTestId('advanced-chart-touch-container');

      fireEvent(chartContainer, 'touchStart');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(true);

      fireEvent(chartContainer, 'touchCancel');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(false);
    });

    it('handles multiple touch start/end cycles', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const chartContainer = getByTestId('advanced-chart-touch-container');

      fireEvent(chartContainer, 'touchStart');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(true);

      fireEvent(chartContainer, 'touchEnd');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(false);

      fireEvent(chartContainer, 'touchStart');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(true);

      fireEvent(chartContainer, 'touchEnd');
      expect(mockSetIsChartBeingTouched).toHaveBeenCalledWith(false);
    });
  });
});
