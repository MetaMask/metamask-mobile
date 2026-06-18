import React from 'react';
import { View } from 'react-native';
import { userEvent, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PriceLegacy, { type PriceLegacyProps } from './Price.legacy';
import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import type { TokenPrice } from '../../../../components/hooks/useTokenHistoricalPrices';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import { CHART_DATA_THRESHOLD } from './tokenOverviewChart.constants';

const mockSelectTechnicalIndicatorsEnabled = jest.fn(() => false);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators',
  () => ({
    selectTokenDetailsTechnicalIndicatorsEnabled: jest.fn(),
  }),
);

jest.mock('../ChartNavigationButton', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onPress }: { onPress: () => void }) => (
      <Pressable testID="chart-navigation-button" onPress={onPress} />
    ),
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

/** Matches CHART_DATA_THRESHOLD (tokenOverviewChart.constants) — enough points for a non-empty line chart. */
const mockPricesAtLeast5: TokenPrice[] = Array.from({ length: 5 }, (_, i) => [
  String(1736761237983 + i),
  100 + i,
]);

jest.mock('../PriceChart/PriceChart', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => null),
}));

const baseProps: PriceLegacyProps = {
  prices: mockPricesAtLeast5,
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
    mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return mockSelectTechnicalIndicatorsEnabled();
      }
      return undefined;
    });
    jest.mocked(PriceChart).mockImplementation(() => <></>);
  });

  it('renders the token price when not loading', () => {
    const { getByTestId } = renderWithProvider(<PriceLegacy {...baseProps} />);
    expect(
      getByTestId(TokenOverviewSelectorsIDs.TOKEN_PRICE),
    ).toBeOnTheScreen();
  });

  it('shows loading skeletons when isLoading is true', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PriceLegacy {...baseProps} isLoading />,
    );

    expect(getByTestId('loading-price-diff')).toBeOnTheScreen();
    expect(queryByTestId('price-label')).not.toBeOnTheScreen();
  });

  it('renders price diff with positive color and sign', () => {
    const { getByTestId } = renderWithProvider(<PriceLegacy {...baseProps} />);
    const label = getByTestId('price-label');
    expect(label).toBeOnTheScreen();
  });

  it('shows price diff text even when prices array is empty', () => {
    const { getByTestId } = renderWithProvider(
      <PriceLegacy {...baseProps} prices={[]} />,
    );
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('does not render token price when currentPrice is NaN', () => {
    const { queryByTestId } = renderWithProvider(
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

    const { getByTestId } = renderWithProvider(<PriceLegacy {...baseProps} />);

    expect(getByTestId('price-label')).toHaveTextContent('Today');

    await userEvent.press(getByTestId('mock-price-chart'));

    expect(getByTestId('price-label')).toHaveTextContent('Jan 13 at 4:40 am');
  });

  it('passes PriceChart the correct props', () => {
    renderWithProvider(<PriceLegacy {...baseProps} />);

    expect(PriceChart).toHaveBeenCalledWith(
      expect.objectContaining({
        priceDiff: 5,
        isLoading: false,
      }),
      undefined,
    );
  });

  it('handles zero priceDiff without sign prefix', () => {
    const { getByTestId } = renderWithProvider(
      <PriceLegacy {...baseProps} priceDiff={0} comparePrice={100} />,
    );
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('handles negative priceDiff', () => {
    const { getByTestId } = renderWithProvider(
      <PriceLegacy
        {...baseProps}
        priceDiff={-10}
        currentPrice={90}
        comparePrice={100}
      />,
    );
    expect(getByTestId('price-label')).toBeOnTheScreen();
  });

  it('passes sparse prices to PriceChart so empty state uses the same threshold', () => {
    jest
      .mocked(PriceChart)
      .mockImplementationOnce(({ prices }) =>
        prices.length < CHART_DATA_THRESHOLD ? (
          <View testID="price-chart-insufficient-data" />
        ) : (
          <></>
        ),
      );

    const fourPrices: TokenPrice[] = Array.from({ length: 4 }, (_, i) => [
      String(1736761237983 + i),
      100 + i,
    ]);
    const { getByTestId } = renderWithProvider(
      <PriceLegacy {...baseProps} prices={fourPrices} />,
    );

    expect(PriceChart).toHaveBeenCalledWith(
      expect.objectContaining({
        prices: distributeDataPoints(fourPrices),
      }),
      undefined,
    );
    expect(getByTestId('price-chart-insufficient-data')).toBeOnTheScreen();
  });

  describe('chart navigation buttons', () => {
    it('calls onTimePeriodChange when a button is pressed with flag OFF (below chart)', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(false);
      const onTimePeriodChange = jest.fn();
      const { getAllByTestId } = renderWithProvider(
        <PriceLegacy
          {...baseProps}
          chartNavigationButtons={['1d', '7d']}
          onTimePeriodChange={onTimePeriodChange}
        />,
      );

      fireEvent.press(getAllByTestId('chart-navigation-button')[0]);

      expect(onTimePeriodChange).toHaveBeenCalledWith('1d');
    });

    it('calls onTimePeriodChange when a button is pressed with flag ON (above chart)', () => {
      mockSelectTechnicalIndicatorsEnabled.mockReturnValue(true);
      const onTimePeriodChange = jest.fn();
      const { getAllByTestId } = renderWithProvider(
        <PriceLegacy
          {...baseProps}
          chartNavigationButtons={['1d', '7d']}
          onTimePeriodChange={onTimePeriodChange}
        />,
      );

      fireEvent.press(getAllByTestId('chart-navigation-button')[1]);

      expect(onTimePeriodChange).toHaveBeenCalledWith('7d');
    });

    it('does not render navigation buttons when onTimePeriodChange is omitted', () => {
      const { queryAllByTestId } = renderWithProvider(
        <PriceLegacy {...baseProps} chartNavigationButtons={['1d', '7d']} />,
      );

      expect(queryAllByTestId('chart-navigation-button')).toHaveLength(0);
    });
  });
});
