import React from 'react';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react-native';
import Price from './Price';
import type { TokenI } from '../../Tokens/types';
import { PriceChartProvider } from '../PriceChart/PriceChart.context';
import { selectTokenOverviewAdvancedChartEnabled } from '../../../../selectors/featureFlagController/tokenOverviewAdvancedChart';
import { selectTokenOverviewChartType } from '../../../../reducers/user/selectors';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
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

jest.mock('../PriceChart/PriceChart', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-legacy-price-chart" />,
  };
});

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
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return false;
      }
      if (selector === selectTokenOverviewChartType) {
        return ChartType.Line;
      }
      return undefined;
    });
  });

  it('shows loading state when isLoading prop is true (advanced)', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return true;
      }
      if (selector === selectTokenOverviewChartType) {
        return ChartType.Line;
      }
      return undefined;
    });
    const { getByTestId } = renderWithProviders(
      <Price {...unifiedProps} isLoading />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
  });

  it('does not show header skeletons when only chart is loading (advanced)', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return true;
      }
      if (selector === selectTokenOverviewChartType) {
        return ChartType.Line;
      }
      return undefined;
    });
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

  it('renders the advanced chart when token overview advanced chart flag is enabled', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return true;
      }
      if (selector === selectTokenOverviewChartType) {
        return ChartType.Line;
      }
      return undefined;
    });
    const { getByTestId } = renderWithProviders(<Price {...unifiedProps} />);

    expect(getByTestId('mock-advanced-chart')).toBeTruthy();
  });

  it('renders the legacy chart when token overview advanced chart flag is disabled', () => {
    const { getByTestId } = renderWithProviders(<Price {...unifiedProps} />);

    expect(getByTestId('mock-legacy-price-chart')).toBeTruthy();
  });
});
