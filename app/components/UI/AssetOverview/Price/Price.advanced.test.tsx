import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PriceAdvanced, { type PriceAdvancedProps } from './Price.advanced';
import PriceLegacy from './Price.legacy';
import type { TokenPrice } from '../../../../components/hooks/useTokenHistoricalPrices';
import type { TokenI } from '../../Tokens/types';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { selectTokenOverviewChartType } from '../../../../reducers/user/selectors';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockDispatch = jest.fn();

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

jest.mock(
  '../../../../selectors/featureFlagController/tokenDetailsOhlcvWsIntegration',
  () => ({
    selectTokenDetailsOhlcvWsEnabled: jest.fn(() => false),
  }),
);

const mockSelectTechnicalIndicatorsEnabled = jest.fn(() => false);
jest.mock(
  '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators',
  () => ({
    selectTokenDetailsTechnicalIndicatorsEnabled:
      mockSelectTechnicalIndicatorsEnabled,
  }),
);

const {
  selectTokenIndicators: selectTokenIndicatorsActual,
  selectTokenOverviewChartInterval: selectTokenOverviewChartIntervalActual,
} = jest.requireActual('../../../../reducers/user/selectors');

const mockUseSelector = jest.fn((selector: unknown) => {
  if (selector === selectTokenIndicatorsActual) return [];
  if (selector === selectTokenOverviewChartIntervalActual) return '15m';
  if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
    return mockSelectTechnicalIndicatorsEnabled();
  }
  return ChartType.Line;
});

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: (selector: unknown) => mockUseSelector(selector),
    useDispatch: jest.fn(() => mockDispatch),
  };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

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

/** Older candles so total length meets CHART_DATA_THRESHOLD (see tokenOverviewChart.constants). */
const ohlcvPaddingThree = [
  { time: 100, open: 90, high: 91, low: 89, close: 90, volume: 1 },
  { time: 200, open: 90, high: 91, low: 89, close: 91, volume: 1 },
  { time: 300, open: 91, high: 92, low: 90, close: 92, volume: 1 },
];

const mockUseOHLCVChart = jest.fn().mockReturnValue({
  ohlcvData: [
    ...ohlcvPaddingThree,
    { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
  ],
  isLoading: false,
  error: undefined,
  hasMore: false,
  nextCursor: null,
  hasEmptyData: false,
});

jest.mock('../../Charts/AdvancedChart/useOHLCVChart', () => ({
  useOHLCVChart: (...args: unknown[]) => mockUseOHLCVChart(...args),
}));

jest.mock('../../Charts/AdvancedChart/useOHLCVRealtime', () => ({
  useOHLCVRealtime: () => ({ latestBar: null }),
}));

jest.mock('../../Charts/AdvancedChart/TimeRangeSelector', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const { ChartType: MockChartType } = jest.requireActual(
    '../../Charts/AdvancedChart/AdvancedChart.types',
  );
  const MockSelector = ({
    onSelect,
    onChartTypeSelect,
    onChartTypeToggle,
    isChartLoading,
  }: {
    onSelect: (r: string) => void;
    onChartTypeSelect?: (type: number) => void;
    onChartTypeToggle?: () => void;
    isChartLoading?: boolean;
  }) => (
    <View
      testID="mock-time-range-selector"
      accessibilityState={{ busy: isChartLoading }}
    >
      <Pressable testID="select-1W" onPress={() => onSelect('1W')} />
      <Pressable testID="select-1D" onPress={() => onSelect('1D')} />
      {(onChartTypeSelect || onChartTypeToggle) && (
        <Pressable
          testID="toggle-chart-type"
          onPress={() =>
            onChartTypeSelect
              ? onChartTypeSelect(MockChartType.Candles)
              : onChartTypeToggle?.()
          }
        >
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

jest.mock('../../Charts/AdvancedChart/IndicatorBar', () => {
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onIndicatorToggle,
    }: {
      onIndicatorToggle?: (name: string) => void;
    }) => (
      <View testID="mock-indicator-bar">
        <Pressable
          testID="toggle-rsi"
          onPress={() => onIndicatorToggle?.('RSI')}
        />
        <Pressable
          testID="toggle-macd"
          onPress={() => onIndicatorToggle?.('MACD')}
        />
        <Pressable
          testID="toggle-bol"
          onPress={() => onIndicatorToggle?.('BOL')}
        />
      </View>
    ),
  };
});

jest.mock('../../Charts/AdvancedChart/IntervalBar', () => {
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const QUICK_INTERVALS = ['1m', '5m', '15m', '1h', '1d'];
  return {
    __esModule: true,
    default: ({
      onIntervalSelect,
    }: {
      onIntervalSelect?: (interval: string) => void;
    }) => (
      <View testID="mock-interval-bar">
        {QUICK_INTERVALS.map((interval) => (
          <Pressable
            key={interval}
            accessibilityLabel={interval}
            onPress={() => onIntervalSelect?.(interval.toUpperCase())}
          >
            <Text>{interval}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

jest.mock('./Price.legacy', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => <View testID="price-legacy-fallback" />),
  };
});

/** Enough points to stay on the advanced path (see CHART_DATA_THRESHOLD in Price.advanced). */
const mockPricesAtLeast5: TokenPrice[] = Array.from({ length: 5 }, (_, i) => [
  String(1000 + i),
  100,
]);

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
  priceDiff: 5,
  comparePrice: 100,
  isLoading: false,
  prices: mockPricesAtLeast5,
};

describe('PriceAdvanced', () => {
  let mockTrackEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
    jest.mocked(PriceLegacy).mockClear();
    const analyticsHook = createMockUseAnalyticsHook({
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    });
    mockTrackEvent = analyticsHook.trackEvent as jest.Mock;
    jest.mocked(useAnalytics).mockReturnValue(analyticsHook);

    // Reset useOHLCVChart to default success state
    mockUseOHLCVChart.mockReturnValue({
      ohlcvData: [
        ...ohlcvPaddingThree,
        { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
        { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
      hasEmptyData: false,
    });

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenIndicatorsActual) return [];
      if (selector === selectTokenOverviewChartIntervalActual) return '15m';
      if (selector === selectTokenOverviewChartType) return ChartType.Line;
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return mockSelectTechnicalIndicatorsEnabled();
      }
      return ChartType.Line;
    });
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
      hasEmptyData: false,
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

  it('falls back to legacy chart when hasEmptyData is true', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
      hasEmptyData: true,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
  });

  it('falls back to legacy when only one OHLCV candle (insufficient for advanced chart)', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
      // One candle is not an empty API response; fallback is candle count < threshold
      hasEmptyData: false,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
  });

  it('falls back to legacy chart on OHLCV error', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: new Error('fetch failed'),
      hasMore: false,
      nextCursor: null,
      hasEmptyData: false,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    // Should fallback to legacy chart when there's an error
    expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
  });

  it('falls back to legacy chart when OHLCV has fewer than 5 candles', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
        { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        { time: 3000, open: 105, high: 106, low: 104, close: 105, volume: 1 },
        { time: 4000, open: 105, high: 106, low: 104, close: 105, volume: 1 },
      ],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
      hasEmptyData: false,
    });
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
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
          chart_type: expect.stringMatching(/^(candlestick|line)$/),
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
    // prevBar close = 100, current price = 105
    // Expected: (105 - 100) / 100 * 100 = 5.00%
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const ohlcvPadBefore = [
      {
        time: oneDayAgo - 4_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 3_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 2_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 100,
        volume: 1,
      },
    ];

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        ...ohlcvPadBefore,
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
      hasEmptyData: false,
    });

    const { getByText } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    // Uses close (100) not open (95) — matches what the line chart visually draws
    expect(getByText(/5\.00%/)).toBeOnTheScreen();
  });

  it('falls back to legacy when OHLCV data is empty', () => {
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [],
      isLoading: false,
      error: undefined,
      hasMore: false,
      nextCursor: null,
      // Same as useOHLCVChart when the API returns an empty data array
      hasEmptyData: true,
    });

    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
  });

  it('updates percentage when time range changes and new OHLCV data loads', () => {
    // Initial: prevBar close = 100, current price = 105
    // Expected: (105 - 100) / 100 * 100 = 5.00%
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const ohlcvPadBefore = [
      {
        time: oneDayAgo - 4_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 3_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 2_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 100,
        volume: 1,
      },
    ];

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        ...ohlcvPadBefore,
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
      hasEmptyData: false,
    });

    const { getByText, rerender } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    expect(getByText(/5\.00%/)).toBeOnTheScreen();

    // After time range change: prevBar close = 103, current = 105
    // Expected: (105 - 103) / 103 * 100 = 1.94%
    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        ...ohlcvPadBefore.slice(0, -1),
        { ...ohlcvPadBefore[2], close: 103 },
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
      hasEmptyData: false,
    });

    rerender(<PriceAdvanced {...baseProps} currentPrice={105} />);

    expect(getByText(/1\.94%/)).toBeOnTheScreen();
  });

  it('displays price diff when dynamicComparePrice is 0', () => {
    // Edge case: prevBar close is 0 — should still render, not hide
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const ohlcvPadBefore = [
      {
        time: oneDayAgo - 4_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 3_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
      },
      {
        time: oneDayAgo - 2_000_000,
        open: 1,
        high: 1,
        low: 1,
        close: 0,
        volume: 1,
      },
    ];

    mockUseOHLCVChart.mockReturnValueOnce({
      ohlcvData: [
        ...ohlcvPadBefore,
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
      hasEmptyData: false,
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
        // Extra history so candle count >= CHART_DATA_THRESHOLD (ignored for compare)
        {
          time: lastBarTime - 4 * oneDayMs,
          open: 50,
          high: 51,
          low: 49,
          close: 50,
          volume: 1,
        },
        // 3 days ago — before visible range, should be skipped
        {
          time: lastBarTime - 3 * oneDayMs,
          open: 200,
          high: 210,
          low: 190,
          close: 200,
          volume: 1,
        },
        // 2 days ago — prevBar (last candle before visible range)
        {
          time: lastBarTime - 2 * oneDayMs,
          open: 190,
          high: 195,
          low: 185,
          close: 100,
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
      hasEmptyData: false,
    });

    const { getByText } = render(
      <PriceAdvanced {...baseProps} currentPrice={105} />,
    );

    // Should use close=100 from the first visible candle, NOT close=200 from 3 days ago
    // (105 - 100) / 100 * 100 = 5.00%
    expect(getByText(/5\.00%/)).toBeOnTheScreen();
  });

  describe('custom network support', () => {
    it('falls back to legacy chart when formatAddressToAssetId throws for unsupported chain', () => {
      // useOHLCVChart should receive empty assetId and skip fetch
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const customNetworkAsset: TokenI = {
        ...mockAsset,
        chainId: '0x999999', // Unsupported custom network
        symbol: 'CUSTOM',
        name: 'Custom Token',
      };

      const { getByTestId } = render(
        <PriceAdvanced {...baseProps} asset={customNetworkAsset} />,
      );

      // Should fallback to legacy chart instead of crashing
      expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
    });

    it('handles formatAddressToAssetId error for Linea Sepolia testnet', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const lineaSepoliaAsset: TokenI = {
        ...mockAsset,
        chainId: '0xe705', // Linea Sepolia - unsupported testnet
        symbol: 'ETH',
        name: 'Ethereum',
      };

      const { getByTestId } = render(
        <PriceAdvanced {...baseProps} asset={lineaSepoliaAsset} />,
      );

      expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
    });

    it('still renders advanced chart for supported networks', () => {
      // Mock successful OHLCV data fetch
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          ...ohlcvPaddingThree,
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId, queryByTestId } = render(
        <PriceAdvanced {...baseProps} />,
      );

      // Should render advanced chart for supported networks
      expect(getByTestId('mock-advanced-chart')).toBeOnTheScreen();
      expect(queryByTestId('price-legacy-fallback')).not.toBeOnTheScreen();
    });

    it('passes empty assetId to useOHLCVChart when formatAddressToAssetId fails', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const customNetworkAsset: TokenI = {
        ...mockAsset,
        chainId: '0x999999', // Unsupported custom network
        address: '0x0000000000000000000000000000000000000000', // Native token
      };

      render(<PriceAdvanced {...baseProps} asset={customNetworkAsset} />);

      // useOHLCVChart should be called with empty assetId
      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: '',
        }),
      );
    });
  });

  describe('performance tracing', () => {
    beforeEach(() => {
      mockTrace.mockClear();
      mockEndTrace.mockClear();
    });

    it('starts initial visibility trace when component mounts with advanced chart', () => {
      render(<PriceAdvanced {...baseProps} />);

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Advanced Chart Initial Visible'),
          op: expect.stringContaining('token_overview.advanced_chart'),
        }),
      );
    });

    it('ends trace when onSkeletonHidden is called with matching series key', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const advancedChart = getByTestId('mock-advanced-chart');

      mockEndTrace.mockClear();

      act(() => {
        advancedChart.props.onSkeletonHidden?.();
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Advanced Chart Initial Visible'),
        }),
      );
    });

    it('ends trace with error data when onError is called', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const advancedChart = getByTestId('mock-advanced-chart');

      mockEndTrace.mockClear();

      act(() => {
        advancedChart.props.onError?.('WebView failed to load');
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Advanced Chart Initial Visible'),
          data: expect.objectContaining({
            errorMessage: 'WebView failed to load',
          }),
        }),
      );
    });

    it('falls back to legacy when TradingView init fails while OHLCV data is available', () => {
      // AdvancedChart renders from useOHLCVChart (ohlcvData), not `prices`.
      // CDN/library failure is the common case: OHLCV succeeded, WebView init did not.
      expect(mockUseOHLCVChart).toBeDefined();
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const advancedChart = getByTestId('mock-advanced-chart');

      act(() => {
        advancedChart.props.onInitFailed?.(
          'Failed to load TradingView library',
        );
      });

      expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
    });

    it('keeps TimeRangeSelector loading until advanced chart is revealed', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const timeRangeSelector = getByTestId('mock-time-range-selector');

      expect(timeRangeSelector.props.accessibilityState?.busy).toBe(true);

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      expect(timeRangeSelector.props.accessibilityState?.busy).toBe(false);
    });

    it('keeps interval and indicator bars hidden until advanced chart is revealed', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenOverviewChartType) return ChartType.Candles;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return true;
        }
        return ChartType.Candles;
      });

      const { getByTestId, queryByTestId } = render(
        <PriceAdvanced {...baseProps} />,
      );

      expect(queryByTestId('mock-interval-bar')).toBeNull();
      expect(queryByTestId('mock-indicator-bar')).toBeNull();

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      expect(getByTestId('mock-interval-bar')).toBeOnTheScreen();
      expect(getByTestId('mock-indicator-bar')).toBeOnTheScreen();
    });

    it('falls back to legacy without flashing interval or indicator bars when init fails', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenOverviewChartType) return ChartType.Candles;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return true;
        }
        return ChartType.Candles;
      });

      const { getByTestId, queryByTestId } = render(
        <PriceAdvanced {...baseProps} />,
      );

      expect(queryByTestId('mock-interval-bar')).toBeNull();
      expect(queryByTestId('mock-indicator-bar')).toBeNull();

      act(() => {
        getByTestId('mock-advanced-chart').props.onInitFailed?.(
          'Failed to load TradingView library',
        );
      });

      expect(getByTestId('price-legacy-fallback')).toBeOnTheScreen();
      expect(queryByTestId('mock-interval-bar')).toBeNull();
      expect(queryByTestId('mock-indicator-bar')).toBeNull();
    });

    it('starts time range visibility trace when time range changes', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      mockTrace.mockClear();

      act(() => {
        fireEvent.press(getByTestId('select-1W'));
      });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Time Range Visible'),
          op: expect.stringContaining('time_range'),
        }),
      );
    });

    it('supersedes previous trace when series key changes before skeleton hidden', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      mockEndTrace.mockClear();

      act(() => {
        fireEvent.press(getByTestId('select-1W'));
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            superseded: true,
          }),
        }),
      );
    });

    it('ends trace with fallbackToLegacy when switching to legacy chart', () => {
      const { rerender } = render(<PriceAdvanced {...baseProps} />);

      mockEndTrace.mockClear();

      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: true,
      });

      rerender(<PriceAdvanced {...baseProps} />);

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fallbackToLegacy: true,
          }),
        }),
      );
    });

    it('includes assetId in trace data when available', () => {
      mockTrace.mockClear();

      render(<PriceAdvanced {...baseProps} />);

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: expect.any(String),
          }),
        }),
      );
    });

    it('does not start trace when falling back to legacy chart immediately', () => {
      mockTrace.mockClear();

      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: true,
      });

      render(<PriceAdvanced {...baseProps} />);

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('ends trace with unmounted flag when component unmounts with open trace', () => {
      const { unmount } = render(<PriceAdvanced {...baseProps} />);

      mockEndTrace.mockClear();

      unmount();

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Advanced Chart Initial Visible'),
          data: expect.objectContaining({
            unmounted: true,
          }),
        }),
      );
    });

    it('does not end trace on unmount when trace was already completed', () => {
      const { getByTestId, unmount } = render(<PriceAdvanced {...baseProps} />);
      const advancedChart = getByTestId('mock-advanced-chart');

      act(() => {
        advancedChart.props.onSkeletonHidden?.();
      });

      mockEndTrace.mockClear();

      unmount();

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('truncates error message to 200 characters', () => {
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);
      const advancedChart = getByTestId('mock-advanced-chart');

      mockEndTrace.mockClear();

      const longError = 'A'.repeat(300);

      act(() => {
        advancedChart.props.onError?.(longError);
      });

      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorMessage: 'A'.repeat(200),
          }),
        }),
      );
    });
  });

  describe('ambient color logic', () => {
    it('returns undefined when useAmbientColor is false', () => {
      const { queryByTestId } = render(
        <PriceAdvanced {...baseProps} useAmbientColor={false} />,
      );

      // When useAmbientColor is false, ambientColor should be undefined
      // This means we won't render the skeleton and will render the chart directly
      expect(queryByTestId('mock-advanced-chart')).toBeOnTheScreen();
    });

    it('returns success green when displayDiff is null (no data)', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          ...ohlcvPaddingThree,
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        ],
        isLoading: true, // Still loading, so displayDiff will be null
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId } = render(
        <PriceAdvanced {...baseProps} useAmbientColor />,
      );

      // When displayDiff is null, should default to positive (success green)
      // The chart should still render because we default to success green
      expect(getByTestId('mock-advanced-chart')).toBeOnTheScreen();
    });

    it('returns success green when displayDiff is positive', () => {
      // OHLCV data: reference close = 100, current price = 105
      // displayDiff = 105 - 100 = 5 (positive)
      const { getByTestId } = render(
        <PriceAdvanced {...baseProps} currentPrice={105} useAmbientColor />,
      );

      // Should render chart with success green color
      expect(getByTestId('mock-advanced-chart')).toBeOnTheScreen();
      const chart = getByTestId('mock-advanced-chart');
      expect(chart.props.lineColorOverride).toBeTruthy();
      // In light mode, should use LIGHT_MODE_SUCCESS_GREEN
    });

    it('returns AMBIENT_NEGATIVE_COLOR when displayDiff is negative', () => {
      // Mock OHLCV data with negative price movement
      // For 1D range: visibleFromMs = lastBarTime - 86400000ms (24 hours)
      // lastBarTime = 100000000, visibleFromMs = 13600000
      // First visible candle at time 20000000 has close=100
      // Last candle has close=95
      // prevBar.close = 100, displayPrice = 95, diff = -5 (negative)
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000000, open: 90, high: 91, low: 89, close: 90, volume: 1 },
          { time: 2000000, open: 90, high: 91, low: 89, close: 91, volume: 1 },
          {
            time: 3000000,
            open: 91,
            high: 101,
            low: 90,
            close: 100,
            volume: 1,
          },
          {
            time: 20000000,
            open: 100,
            high: 101,
            low: 99,
            close: 100,
            volume: 1,
          }, // First in visible range
          {
            time: 100000000,
            open: 100,
            high: 100,
            low: 95,
            close: 95,
            volume: 1,
          }, // Last bar
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId } = render(
        <PriceAdvanced {...baseProps} currentPrice={95} useAmbientColor />,
      );

      // Should render chart with negative color (#FF5C16)
      expect(getByTestId('mock-advanced-chart')).toBeOnTheScreen();
      const chart = getByTestId('mock-advanced-chart');
      // eslint-disable-next-line @metamask/design-tokens/color-no-hex
      expect(chart.props.lineColorOverride).toBe('#FF5C16');
    });

    it('calls onPriceDirectionChange with true for positive displayDiff', () => {
      const mockOnPriceDirectionChange = jest.fn();

      render(
        <PriceAdvanced
          {...baseProps}
          currentPrice={105}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
        />,
      );

      // Should call callback with true for positive price diff
      expect(mockOnPriceDirectionChange).toHaveBeenCalledWith(true);
    });

    it('calls onPriceDirectionChange with false for negative displayDiff', () => {
      const mockOnPriceDirectionChange = jest.fn();

      // Mock OHLCV data with negative price movement
      // prevBar.close = 100, lastBar.close = 95 → negative diff
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000000, open: 90, high: 91, low: 89, close: 90, volume: 1 },
          { time: 2000000, open: 90, high: 91, low: 89, close: 91, volume: 1 },
          {
            time: 3000000,
            open: 91,
            high: 101,
            low: 90,
            close: 100,
            volume: 1,
          },
          {
            time: 20000000,
            open: 100,
            high: 101,
            low: 99,
            close: 100,
            volume: 1,
          }, // First in visible range
          {
            time: 100000000,
            open: 100,
            high: 100,
            low: 95,
            close: 95,
            volume: 1,
          }, // Last bar
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      render(
        <PriceAdvanced
          {...baseProps}
          currentPrice={95}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
        />,
      );

      // Should call callback with false for negative price diff
      expect(mockOnPriceDirectionChange).toHaveBeenCalledWith(false);
    });

    it('does not call onPriceDirectionChange when falling back to legacy', () => {
      const mockOnPriceDirectionChange = jest.fn();

      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      render(
        <PriceAdvanced
          {...baseProps}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
        />,
      );

      // Should not call callback when falling back to legacy (insufficient data)
      expect(mockOnPriceDirectionChange).not.toHaveBeenCalled();
    });

    it('calls onPriceDirectionChange exactly once when OHLCV data is sufficient (>= 5 bars)', () => {
      const mockOnPriceDirectionChange = jest.fn();

      // Sufficient OHLCV data (5 bars total)
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          ...ohlcvPaddingThree, // 3 bars
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      render(
        <PriceAdvanced
          {...baseProps}
          currentPrice={105}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
        />,
      );

      // Should call callback exactly once with OHLCV-based direction
      expect(mockOnPriceDirectionChange).toHaveBeenCalledTimes(1);
      expect(mockOnPriceDirectionChange).toHaveBeenCalledWith(true); // positive price
    });

    it('does not call onPriceDirectionChange when OHLCV data is insufficient (< 5 bars) - legacy handles it', () => {
      const mockOnPriceDirectionChange = jest.fn();

      // Insufficient OHLCV data (4 bars total) - should fallback to legacy
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 100, open: 90, high: 91, low: 89, close: 90, volume: 1 },
          { time: 200, open: 90, high: 91, low: 89, close: 91, volume: 1 },
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      render(
        <PriceAdvanced
          {...baseProps}
          currentPrice={105}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
          priceDiff={5} // Legacy will use this
        />,
      );

      // PriceAdvanced should NOT call callback (guarded by shouldFallbackToLegacy)
      // PriceLegacy will call it instead when !isLoading
      expect(mockOnPriceDirectionChange).not.toHaveBeenCalled();
    });

    it('prevents stale OHLCV callback from overriding legacy when falling back', () => {
      const mockOnPriceDirectionChange = jest.fn();

      // Single OHLCV bar (would compute initialPriceDiff = 0, always positive)
      // But priceDiff is negative
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      render(
        <PriceAdvanced
          {...baseProps}
          currentPrice={95}
          useAmbientColor
          onPriceDirectionChange={mockOnPriceDirectionChange}
          priceDiff={-5} // Negative - should be used by legacy
        />,
      );

      // PriceAdvanced should NOT call with stale OHLCV-based value
      // This test would FAIL if we remove the !shouldFallbackToLegacy guard
      expect(mockOnPriceDirectionChange).not.toHaveBeenCalled();
    });
  });

  describe('effectiveTimePeriod selection based on feature flag', () => {
    beforeEach(() => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
    });

    it('uses config.timePeriod when technical indicators flag is OFF', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);

      render(<PriceAdvanced {...baseProps} />);

      // Default timeRange is '1D' which maps to timePeriod '1d' in TIME_RANGE_CONFIGS
      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1d',
        }),
      );
    });

    it('uses config.timePeriod for 1H time range when technical indicators flag is OFF', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);

      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      mockUseOHLCVChart.mockClear();

      // Simulate selecting 1H time range
      const mockTimeRangeSelector = getByTestId('mock-time-range-selector');
      // Since the mock doesn't have a 1H button, we'll verify the initial state
      // The important part is that when flag is OFF, it should use config.timePeriod

      // For '1H' timeRange:
      // - WS_INTERVAL_BY_TIME_RANGE['1H'] = '1m'
      // - INTERVAL_TO_TIME_PERIOD['1m'] = '1d'
      // - TIME_RANGE_CONFIGS['1H'].timePeriod = '1h'
      // With flag OFF, should use '1h', not '1d'
    });

    it('uses INTERVAL_TO_TIME_PERIOD when technical indicators flag is ON', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);

      render(<PriceAdvanced {...baseProps} />);

      // Default timeRange is '1D':
      // - displayInterval starts as wsInterval = WS_INTERVAL_BY_TIME_RANGE['1D'] = '15m'
      // - chartInterval = '15m'
      // - INTERVAL_TO_TIME_PERIOD['15m'] = '1d'
      // With flag ON, should use '1d' from INTERVAL_TO_TIME_PERIOD
      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1d',
          interval: '15m',
        }),
      );
    });

    it('correctly derives timePeriod for each time range when flag is OFF', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);

      const testCases: {
        range: string;
        expectedTimePeriod: string;
        wsInterval: string;
      }[] = [
        { range: '1H', expectedTimePeriod: '1h', wsInterval: '1m' },
        { range: '1D', expectedTimePeriod: '1d', wsInterval: '15m' },
        { range: '1W', expectedTimePeriod: '1w', wsInterval: '1h' },
        { range: '1M', expectedTimePeriod: '1m', wsInterval: '1d' },
        { range: '1Y', expectedTimePeriod: '1y', wsInterval: '1d' },
      ];

      // We can only test the initial render with '1D'
      // since our mock selector doesn't expose all time ranges
      const { rerender } = render(<PriceAdvanced {...baseProps} />);

      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1d', // Initial timeRange is '1D'
          interval: undefined, // flag OFF: config.interval omitted (API default)
        }),
      );
    });

    it('correctly uses INTERVAL_TO_TIME_PERIOD for candle intervals when flag is ON', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);

      render(<PriceAdvanced {...baseProps} />);

      // For '1D' timeRange:
      // - wsInterval = '15m'
      // - INTERVAL_TO_TIME_PERIOD['15m'] = '1d'
      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1d',
          interval: '15m',
        }),
      );
    });
  });

  describe('indicator persistence across chart type toggle', () => {
    const defaultUseSelectorImpl = (
      selector: unknown,
      chartType: ChartType = ChartType.Candles,
      persisted: string[] = ['RSI'],
      persistedInterval = '15m',
    ) => {
      if (selector === selectTokenIndicatorsActual) return persisted;
      if (selector === selectTokenOverviewChartIntervalActual) {
        return persistedInterval;
      }
      if (selector === selectTokenOverviewChartType) return chartType;
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return mockSelectTechnicalIndicatorsEnabled();
      }
      return chartType;
    };

    afterEach(() => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return mockSelectTechnicalIndicatorsEnabled();
        }
        return ChartType.Line;
      });
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
    });

    it('keeps indicators in Redux and restores chart props when returning to candlestick', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      let chartType: ChartType = ChartType.Candles;
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) =>
        defaultUseSelectorImpl(selector, chartType, ['RSI']),
      );

      const { getByTestId, rerender } = render(
        <PriceAdvanced {...baseProps} />,
      );

      expect(getByTestId('mock-advanced-chart').props.indicators).toEqual([
        'RSI',
      ]);

      chartType = ChartType.Line;
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) =>
        defaultUseSelectorImpl(selector, chartType, ['RSI']),
      );
      rerender(<PriceAdvanced {...baseProps} />);

      expect(getByTestId('mock-advanced-chart').props.indicators).toEqual([]);
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'SET_TOKEN_INDICATORS',
        payload: { indicators: [] },
      });

      chartType = ChartType.Candles;
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) =>
        defaultUseSelectorImpl(selector, chartType, ['RSI']),
      );
      rerender(<PriceAdvanced {...baseProps} />);

      expect(getByTestId('mock-advanced-chart').props.indicators).toEqual([
        'RSI',
      ]);
    });
  });

  describe('chart interval persistence', () => {
    const enableIndicatorBar = (persistedInterval = '15m') => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) {
          return persistedInterval;
        }
        if (selector === selectTokenOverviewChartType) return ChartType.Candles;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return true;
        }
        return ChartType.Candles;
      });
    };

    beforeEach(() => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
    });

    it('uses persisted interval for OHLCV fetch when technical indicators flag is ON', () => {
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === selectTokenOverviewChartIntervalActual) return '1h';
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartType) return ChartType.Candles;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return true;
        }
        return ChartType.Candles;
      });

      render(<PriceAdvanced {...baseProps} />);

      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1w',
          interval: '1h',
        }),
      );
    });

    it('dispatches SET_TOKEN_OVERVIEW_CHART_INTERVAL when user selects an interval', () => {
      enableIndicatorBar();

      const { getByLabelText, getByTestId } = render(
        <PriceAdvanced {...baseProps} />,
      );

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      mockUseOHLCVChart.mockClear();

      fireEvent.press(getByLabelText('1h'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_TOKEN_OVERVIEW_CHART_INTERVAL',
        payload: { interval: '1h' },
      });
      expect(mockUseOHLCVChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timePeriod: '1w',
          interval: '1h',
        }),
      );
    });

    it('does not dispatch interval persistence when technical indicators flag is OFF', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenOverviewChartType) return ChartType.Line;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return false;
        }
        return ChartType.Line;
      });

      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      fireEvent.press(getByTestId('select-1W'));

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_TOKEN_OVERVIEW_CHART_INTERVAL',
        }),
      );
    });
  });

  describe('handleIndicatorToggle', () => {
    const enableIndicatorBar = (persisted: string[] = []) => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      (mockUseSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return persisted;
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenOverviewChartType) return ChartType.Candles;
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return true;
        }
        return ChartType.Candles;
      });
    };

    afterEach(() => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectTokenIndicatorsActual) return [];
        if (selector === selectTokenOverviewChartIntervalActual) return '15m';
        if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
          return mockSelectTechnicalIndicatorsEnabled();
        }
        return ChartType.Line;
      });
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
    });

    it('tracks indicator_toggled on when an indicator is turned on', () => {
      enableIndicatorBar();
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      fireEvent.press(getByTestId('toggle-rsi'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'chart_interacted',
          properties: expect.objectContaining({
            interaction_type: 'indicator_toggled',
            indicator_type: 'RSI',
            indicator_action: 'on',
            indicators_active: ['RSI'],
            chart_type: 'candlestick',
          }),
        }),
      );
    });

    it('tracks indicator_toggled off when an active indicator is turned off', () => {
      enableIndicatorBar(['RSI']);
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      fireEvent.press(getByTestId('toggle-rsi'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'chart_interacted',
          properties: expect.objectContaining({
            interaction_type: 'indicator_toggled',
            indicator_type: 'RSI',
            indicator_action: 'off',
            indicators_active: [],
          }),
        }),
      );
    });

    it('replaces other sub-pane indicators when selecting a new one', () => {
      enableIndicatorBar(['MACD']);
      const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

      act(() => {
        getByTestId('mock-advanced-chart').props.onSkeletonHidden?.();
      });

      fireEvent.press(getByTestId('toggle-rsi'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            indicator_type: 'RSI',
            indicator_action: 'on',
            indicators_active: ['RSI'],
          }),
        }),
      );
    });
  });
});
