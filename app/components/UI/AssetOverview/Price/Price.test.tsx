import React from 'react';
import { View as RNView } from 'react-native';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react-native';
import Price from './Price';
import { usePriceChartContext } from './Price.context';
import type { TokenI } from '../../Tokens/types';
import { PriceChartProvider } from '../PriceChart/PriceChart.context';
import {
  selectTokenOverviewChartType,
  selectTokenIndicators,
} from '../../../../reducers/user/selectors';
import { selectTokenDetailsOhlcvWsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsOhlcvWsIntegration';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: () => false,
    isTokenTradingOpen: () => true,
  }),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: jest.fn(),
    useDispatch: jest.fn(() => jest.fn()),
  };
});

jest.mock('../../Charts/AdvancedChart/AdvancedChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-advanced-chart" />,
  };
});

const mockUseOHLCVChart = jest.fn().mockReturnValue({
  ohlcvData: [
    { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
    { time: 3000, open: 105, high: 107, low: 104, close: 106, volume: 1 },
    { time: 4000, open: 106, high: 108, low: 105, close: 107, volume: 1 },
    { time: 5000, open: 107, high: 109, low: 106, close: 108, volume: 1 },
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

jest.mock('../PriceChart/PriceChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-legacy-price-chart" />,
  };
});

jest.mock('../NoDataOverlay/NoDataOverlay', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="price-chart-no-data">
        <Text>No chart data</Text>
      </View>
    ),
  };
});

jest.mock('../../Charts/AdvancedChart/OHLCVBar/ohlcvBarVolumeFormat', () => ({
  formatVolume: jest.fn(() => '0'),
}));

const mockUseSelector = jest.mocked(useSelector);

function renderWithProviders(ui: React.ReactElement) {
  return render(<PriceChartProvider>{ui}</PriceChartProvider>);
}

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

/** Must be >= CHART_DATA_THRESHOLD so advanced path does not fall back to legacy. */
const mockPricesAtLeast5 = Array.from({ length: 5 }, (_, i) => [
  String(1736761237983 + i),
  100 + i,
]) as [string, number][];

const unifiedProps = {
  asset: mockAsset,
  prices: mockPricesAtLeast5,
  timePeriod: '1d' as const,
  priceDiff: 5,
  currentPrice: 105,
  currentCurrency: 'USD',
  comparePrice: 100,
  isLoading: false,
};

describe('Price Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewChartType) {
        return ChartType.Candles;
      }
      if (selector === selectTokenIndicators) {
        return [];
      }
      if (selector === selectTokenDetailsOhlcvWsEnabled) {
        return false;
      }
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return false;
      }
      return undefined;
    });
  });

  it('shows loading state when isLoading prop is true', () => {
    const { getByTestId } = renderWithProviders(
      <Price {...unifiedProps} isLoading />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
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
    const { queryByTestId } = renderWithProviders(
      <Price {...unifiedProps} isLoading={false} />,
    );

    expect(queryByTestId('loading-price-diff')).toBeNull();
  });

  it('renders the advanced chart when OHLCV data is available', () => {
    const { getByTestId } = renderWithProviders(<Price {...unifiedProps} />);

    expect(getByTestId('mock-advanced-chart')).toBeTruthy();
  });

  describe('showCandleEmptyState logic', () => {
    it('shows empty state when OHLCV data length is below threshold (< 5)', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId, getByText } = renderWithProviders(
        <Price {...unifiedProps} />,
      );

      expect(getByText('No chart data')).toBeTruthy();
      // Advanced chart is still mounted but hidden (opacity: 0)
      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
    });

    it('shows empty state when hasEmptyData is true', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
          { time: 3000, open: 105, high: 107, low: 104, close: 106, volume: 1 },
          { time: 4000, open: 106, high: 108, low: 105, close: 107, volume: 1 },
          { time: 5000, open: 107, high: 109, low: 106, close: 108, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: true,
      });

      const { getByTestId, getByText } = renderWithProviders(
        <Price {...unifiedProps} />,
      );

      expect(getByText('No chart data')).toBeTruthy();
      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
    });

    it('shows empty state when chartError is present', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
          { time: 3000, open: 105, high: 107, low: 104, close: 106, volume: 1 },
          { time: 4000, open: 106, high: 108, low: 105, close: 107, volume: 1 },
          { time: 5000, open: 107, high: 109, low: 106, close: 108, volume: 1 },
        ],
        isLoading: false,
        error: new Error('Failed to fetch OHLCV data'),
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId, getByText } = renderWithProviders(
        <Price {...unifiedProps} />,
      );

      expect(getByText('No chart data')).toBeTruthy();
      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
    });

    it('does NOT show empty state when chart is still loading', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [],
        isLoading: true,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: false,
      });

      const { getByTestId, queryByText } = renderWithProviders(
        <Price {...unifiedProps} isLoading={false} />,
      );

      expect(queryByText('No chart data')).toBeNull();
      expect(getByTestId('token-price')).toBeTruthy();
    });

    it('does NOT show empty state when OHLCV data is sufficient (>= 5)', () => {
      const { getByTestId, queryByText } = renderWithProviders(
        <Price {...unifiedProps} />,
      );

      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
      expect(queryByText('No chart data')).toBeNull();
    });

    it('shows empty state when OHLCV data is exactly at threshold (5) but hasEmptyData is true', () => {
      mockUseOHLCVChart.mockReturnValueOnce({
        ohlcvData: [
          { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
          { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
          { time: 3000, open: 105, high: 107, low: 104, close: 106, volume: 1 },
          { time: 4000, open: 106, high: 108, low: 105, close: 107, volume: 1 },
          { time: 5000, open: 107, high: 109, low: 106, close: 108, volume: 1 },
        ],
        isLoading: false,
        error: undefined,
        hasMore: false,
        nextCursor: null,
        hasEmptyData: true,
      });

      const { getByTestId, getByText } = renderWithProviders(
        <Price {...unifiedProps} />,
      );

      expect(getByText('No chart data')).toBeTruthy();
      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
    });
  });

  describe('compound composition', () => {
    it('renders caller content between the header and the chart', () => {
      const { getByTestId } = renderWithProviders(
        <Price.Provider {...unifiedProps}>
          <Price.Header />
          <RNView testID="interleaved-section" />
          <Price.Chart />
        </Price.Provider>,
      );

      expect(getByTestId('token-price')).toBeTruthy();
      expect(getByTestId('interleaved-section')).toBeTruthy();
      expect(getByTestId('mock-advanced-chart')).toBeTruthy();
    });

    it('renders a single chart when the parts share one provider', () => {
      const { getAllByTestId } = renderWithProviders(
        <Price.Provider {...unifiedProps}>
          <Price.Header />
          <Price.Chart />
        </Price.Provider>,
      );

      expect(getAllByTestId('mock-advanced-chart')).toHaveLength(1);
    });

    it('throws when a part is rendered outside Price.Provider', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const Orphan = () => {
        usePriceChartContext();
        return null;
      };

      expect(() => render(<Orphan />)).toThrow(
        'usePriceChartContext must be used within a Price.Provider',
      );

      consoleError.mockRestore();
    });
  });
});
