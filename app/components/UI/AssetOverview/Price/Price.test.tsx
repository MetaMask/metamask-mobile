import React from 'react';
import { render } from '@testing-library/react-native';
import Price from './Price';
import { TimePeriod } from '../../../../components/hooks/useTokenHistoricalPrices';

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
    ohlcvData: [],
    isLoading: false,
    fetchMoreHistory: jest.fn(),
  }),
}));

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
  timePeriod: TimePeriod;
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
  describe('Header', () => {
    it('renders header correctly when asset name and symbol are provided', () => {
      const props = {
        ...mockProps,
        asset: {
          ...mockProps.asset,
          ticker: '',
        },
      };

      const { getByText } = render(<Price {...props} />);

      expect(
        getByText(`${mockProps.asset.name} (${mockProps.asset.symbol})`),
      ).toBeTruthy();
    });

    it('renders header correctly when name not provided and symbol is provided', () => {
      const props = {
        ...mockProps,
        asset: {
          ...mockProps.asset,
          name: '',
          ticker: '',
        },
      };

      const { getByText } = render(<Price {...props} />);

      expect(getByText(`${mockProps.asset.symbol}`)).toBeTruthy();
    });

    it('renders header correctly when name and ticker are provided', () => {
      const { getByText } = render(<Price {...mockProps} />);

      expect(
        getByText(`${mockProps.asset.name} (${mockProps.asset.ticker})`),
      ).toBeTruthy();
    });
  });

  it('shows loading state when isLoading is true', () => {
    const { getByTestId } = render(
      <Price {...{ ...mockProps, isLoading: true }} />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
  });

  it('renders the advanced chart', () => {
    const { getByTestId } = render(<Price {...mockProps} />);

    expect(getByTestId('mock-advanced-chart')).toBeTruthy();
  });
});
