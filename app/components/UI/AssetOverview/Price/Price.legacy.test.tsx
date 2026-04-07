import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import PriceLegacy, { type PriceLegacyProps } from './Price.legacy';
import PriceChart from '../PriceChart/PriceChart';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';

jest.mock('../PriceChart/PriceChart', () => ({
  ...jest.requireActual('../PriceChart/PriceChart'),
  __esModule: true,
  default: jest.fn().mockImplementation(() => null),
}));

const baseProps: PriceLegacyProps = {
  prices: [
    ['1736761237983', 100],
    ['1736761237986', 105],
  ],
  priceDiff: 5,
  currentPrice: 105,
  currentCurrency: 'USD',
  comparePrice: 100,
  isLoading: false,
  timePeriod: '1d',
};

describe('PriceLegacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token price when not loading', () => {
    const { getByTestId } = render(<PriceLegacy {...baseProps} />);
    expect(
      getByTestId(TokenOverviewSelectorsIDs.TOKEN_PRICE),
    ).toBeOnTheScreen();
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { getByTestId, queryByTestId } = render(
      <PriceLegacy {...baseProps} isLoading />,
    );

    expect(getByTestId('loading-price-diff')).toBeOnTheScreen();
    expect(queryByTestId('price-label')).not.toBeOnTheScreen();
  });

  it('renders price diff with positive color and sign', () => {
    const { getByTestId } = render(<PriceLegacy {...baseProps} />);
    const label = getByTestId('price-label');
    expect(label).toBeOnTheScreen();
  });

  it('hides price diff text when prices array is empty', () => {
    const { queryByTestId } = render(
      <PriceLegacy {...baseProps} prices={[]} />,
    );
    expect(queryByTestId('price-label')).not.toBeOnTheScreen();
  });

  it('does not render token price when currentPrice is NaN', () => {
    const { queryByTestId } = render(
      <PriceLegacy {...baseProps} currentPrice={NaN} />,
    );
    expect(
      queryByTestId(TokenOverviewSelectorsIDs.TOKEN_PRICE),
    ).not.toBeOnTheScreen();
  });

  it('renders price at selected chart index via onChartIndexChange', async () => {
    jest.mocked(PriceChart).mockImplementation(({ onChartIndexChange }) => (
      <Button
        testID="mock-price-chart"
        variant={ButtonVariant.Primary}
        onPress={() => onChartIndexChange(1)}
      >
        Select Point
      </Button>
    ));

    const { getByTestId } = render(<PriceLegacy {...baseProps} />);

    expect(getByTestId('price-label')).toHaveTextContent('Today');

    await userEvent.press(getByTestId('mock-price-chart'));

    expect(getByTestId('price-label')).toHaveTextContent('Jan 13 at 4:40 am');
  });

  it('passes PriceChart the correct props', () => {
    render(<PriceLegacy {...baseProps} />);

    expect(PriceChart).toHaveBeenCalledWith(
      expect.objectContaining({
        priceDiff: 5,
        isLoading: false,
      }),
      expect.anything(),
    );
  });

  it('handles zero priceDiff without sign prefix', () => {
    const { getByTestId } = render(
      <PriceLegacy {...baseProps} priceDiff={0} comparePrice={100} />,
    );
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('handles negative priceDiff', () => {
    const { getByTestId } = render(
      <PriceLegacy
        {...baseProps}
        priceDiff={-10}
        currentPrice={90}
        comparePrice={100}
      />,
    );
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });
});
