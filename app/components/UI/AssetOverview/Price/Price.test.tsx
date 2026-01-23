import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import Price from './Price';
import { TokenI } from '../../Tokens/types';
import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import PriceChart from '../PriceChart/PriceChart';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';

jest.mock('../PriceChart/PriceChart', () => ({
  ...jest.requireActual('../PriceChart/PriceChart'),
  __esModule: true,
  default: jest.fn().mockImplementation(() => null),
}));

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: jest.fn().mockReturnValue(false),
    isTokenTradingOpen: jest.fn().mockResolvedValue(true),
  }),
}));

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

      const { getAllByText } = render(<Price {...props} />);

      // Name and symbol are rendered separately
      // When name and symbol are the same, we expect to find both text nodes
      const elements = getAllByText(mockProps.asset.name);
      expect(elements.length).toBeGreaterThanOrEqual(1);
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

      // Name and ticker are rendered separately
      expect(getByText(mockProps.asset.name)).toBeTruthy();
      expect(getByText(mockProps.asset.ticker)).toBeTruthy();
    });
  });

  it('shows loading state when isLoading is true', () => {
    const { getByTestId } = render(
      <Price {...{ ...mockProps, isLoading: true }} />,
    );

    expect(getByTestId('loading-price-diff')).toBeTruthy();
  });

  it('renders price at selected date', async () => {
    jest
      .mocked(PriceChart)
      .mockImplementation(({ onChartIndexChange }) => (
        <Button
          testID="mock-price-chart"
          variant={ButtonVariants.Primary}
          label="TEST BUTTON"
          onPress={() => onChartIndexChange(1)}
        />
      ));

    const { getByTestId } = render(<Price {...{ ...mockProps }} />);

    // No item selected - assert label
    expect(getByTestId('price-label')).toHaveTextContent('Today');

    // Act - click mock button to change chart index
    await userEvent.press(getByTestId('mock-price-chart'));

    // A date has been selected, show correct mock date
    expect(getByTestId('price-label')).toHaveTextContent('Jan 13 at 4:40 am');
  });
});
