import React from 'react';
import { render } from '@testing-library/react-native';
import Price from './Price';
import { TokenI } from '../../Tokens/types';
import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';

const mockAsset: TokenI = {
  name: 'Ethereum',
  ticker: 'ETH',
  symbol: 'Ethereum',
  address: '0x0',
  aggregators: [],
  decimals: 18,
  image: '',
  balance: '100',
  balanceFiat: '$100',
  logo: '',
  isETH: true,
  isNative: true,
};

const mockPrices: TokenPrice[] = [
  ['1736761237983', 100],
  ['1736761237986', 105],
];

const mockProps: {
  asset: TokenI;
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: TimePeriod;
} = {
  asset: mockAsset,
  prices: mockPrices,
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
});
