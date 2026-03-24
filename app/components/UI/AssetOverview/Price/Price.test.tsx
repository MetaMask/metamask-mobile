import React from 'react';
import { render } from '@testing-library/react-native';
import Price from './Price';
import { PriceChartProvider } from '../PriceChart/PriceChart.context';

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: () => false,
    isTokenTradingOpen: () => true,
  }),
}));

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

function renderWithProviders(ui: React.ReactElement) {
  return render(<PriceChartProvider>{ui}</PriceChartProvider>);
}

const mockProps: {
  asset: {
    address: string;
    chainId: string;
    name: string;
    symbol: string;
    ticker?: string;
  };
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
} = {
  asset: {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    name: 'Test Token',
    symbol: 'TST',
    ticker: 'TST',
  },
  priceDiff: 5,
  currentPrice: 105,
  currentCurrency: 'USD',
  comparePrice: 100,
  isLoading: false,
  timePeriod: '1d',
};

describe('Price Component', () => {
  it('shows loading state when isLoading is true', () => {
    const { getByTestId } = renderWithProviders(
      <Price {...{ ...mockProps, isLoading: true }} />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
  });

  it('renders the advanced chart', () => {
    const { getByTestId } = renderWithProviders(<Price {...mockProps} />);

    expect(getByTestId('mock-advanced-chart')).toBeTruthy();
  });
});
