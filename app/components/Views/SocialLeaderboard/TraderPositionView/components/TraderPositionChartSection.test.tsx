import React from 'react';
import { render } from '@testing-library/react-native';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import TraderPositionChartSection from './TraderPositionChartSection';

const mockAdvancedChart = jest.fn();
const mockPriceChart = jest.fn();

jest.mock('../../../../UI/AssetOverview/PriceChart/PriceChart.context', () => ({
  PriceChartProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./TraderAdvancedChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockAdvancedChart(props);
      return <View testID="advanced-chart-mock" />;
    },
  };
});

jest.mock('./TraderPriceChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockPriceChart(props);
      return <View testID="price-chart-mock" />;
    },
  };
});

const defaultProps = {
  historicalPrices: [] as TokenPrice[],
  priceDiff: 0,
  isPricesLoading: false,
  onChartIndexChange: jest.fn(),
  trades: [],
  activeTimePeriod: '1M' as const,
};

describe('TraderPositionChartSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the advanced chart for a spot asset id', () => {
    const { getByTestId } = render(
      <TraderPositionChartSection
        {...defaultProps}
        assetId="eip155:8453/erc20:0x1"
      />,
    );

    expect(getByTestId('advanced-chart-mock')).toBeOnTheScreen();
  });

  it('renders the legacy price chart when there is no asset id and it is not a perp', () => {
    const { getByTestId } = render(
      <TraderPositionChartSection {...defaultProps} />,
    );

    expect(getByTestId('price-chart-mock')).toBeOnTheScreen();
  });

  it('forwards scrollPassthrough to the advanced chart', () => {
    render(
      <TraderPositionChartSection
        {...defaultProps}
        assetId="eip155:8453/erc20:0x1"
        scrollPassthrough
      />,
    );

    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({ scrollPassthrough: true }),
    );
  });

  it('forwards scrollPassthrough to the legacy price chart', () => {
    render(<TraderPositionChartSection {...defaultProps} scrollPassthrough />);

    expect(mockPriceChart).toHaveBeenCalledWith(
      expect.objectContaining({ scrollPassthrough: true }),
    );
  });

  it('defaults scrollPassthrough to false', () => {
    render(<TraderPositionChartSection {...defaultProps} />);

    expect(mockPriceChart).toHaveBeenCalledWith(
      expect.objectContaining({ scrollPassthrough: false }),
    );
  });
});
