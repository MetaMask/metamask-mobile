import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import Price from './Price';
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

const mockPrices: TokenPrice[] = [
  ['1736761237983', 100],
  ['1736761237986', 105],
];

const mockProps: {
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: TimePeriod;
} = {
  prices: mockPrices,
  priceDiff: 5,
  currentPrice: 105,
  currentCurrency: 'USD',
  comparePrice: 100,
  isLoading: false,
  timePeriod: '1d',
};

describe('Price Component', () => {
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
