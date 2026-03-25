import React from 'react';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react-native';
import Price from './Price';
import { PriceChartProvider } from '../PriceChart/PriceChart.context';
import { selectTokenOverviewAdvancedChartEnabled } from '../../../../selectors/featureFlagController/tokenOverviewAdvancedChart';

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

jest.mock('../../Charts/AdvancedChart/useOHLCVChart', () => ({
  useOHLCVChart: () => ({
    ohlcvData: [
      { time: 1000, open: 100, high: 101, low: 99, close: 100, volume: 1 },
      { time: 2000, open: 100, high: 106, low: 100, close: 105, volume: 1 },
    ],
    isLoading: false,
    error: undefined,
    fetchMoreHistory: jest.fn(),
  }),
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

const unifiedProps = {
  asset: {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    name: 'Test Token',
    symbol: 'TST',
    ticker: 'TST',
  },
  prices: [
    ['1736761237983', 100] as [string, number],
    ['1736761237986', 105] as [string, number],
  ],
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
      return undefined;
    });
  });

  it('shows loading state when isLoading is true (advanced)', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return true;
      }
      return undefined;
    });
    const { getByTestId } = renderWithProviders(
      <Price {...{ ...unifiedProps, isLoading: true }} />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
  });

  it('renders the advanced chart when token overview advanced chart flag is enabled', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTokenOverviewAdvancedChartEnabled) {
        return true;
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
