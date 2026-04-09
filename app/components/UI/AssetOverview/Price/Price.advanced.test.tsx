import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PriceAdvanced, { type PriceAdvancedProps } from './Price.advanced';
import type { TokenI } from '../../Tokens/types';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';

jest.mock('../../../hooks/useAnalytics/useAnalytics');

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
      '1H': { timePeriod: '1h' },
      '1D': { timePeriod: '1d' },
      '1W': { timePeriod: '1w' },
      '1M': { timePeriod: '1m' },
      '1Y': { timePeriod: '1y' },
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
  priceDiff: 5,
  currentPrice: 105,
  currentCurrency: 'USD',
  comparePrice: 100,
  isLoading: false,
};

describe('PriceAdvanced', () => {
  let mockTrackEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const analyticsHook = createMockUseAnalyticsHook();
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

  it('tracks CHART_TIMEFRAME_CHANGED when a different time range is selected', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('select-1W'));

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('does not track when selecting the already-active time range', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('select-1D'));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks CHART_TYPE_CHANGED when chart type is toggled', () => {
    const { getByTestId } = render(<PriceAdvanced {...baseProps} />);

    fireEvent.press(getByTestId('toggle-chart-type'));

    expect(mockTrackEvent).toHaveBeenCalled();
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
});
