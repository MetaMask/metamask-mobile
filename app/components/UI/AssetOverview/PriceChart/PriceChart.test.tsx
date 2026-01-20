import React from 'react';
import { render } from '@testing-library/react-native';
import PriceChart from './PriceChart';
import { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'asset_overview.no_chart_data.title': 'No chart data',
      'asset_overview.no_chart_data.description':
        'We could not fetch any data for this token',
      'asset_overview.no_chart_data.insufficient_data':
        'Data is not available for this time period',
    };
    return translations[key] || key;
  },
}));

describe('PriceChart', () => {
  const mockOnChartIndexChange = jest.fn();

  const defaultProps = {
    prices: [] as TokenPrice[],
    priceDiff: 0,
    isLoading: false,
    onChartIndexChange: mockOnChartIndexChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NoDataOverlay', () => {
    it('shows full overlay with icon and description when there are no data points', () => {
      const { getByText, getByTestId } = render(
        <PriceChart {...defaultProps} prices={[]} />,
      );

      // Should show title
      expect(getByText('No chart data')).toBeOnTheScreen();

      // Should show description
      expect(
        getByText('We could not fetch any data for this token'),
      ).toBeOnTheScreen();

      // Should render no data overlay with icon
      expect(getByTestId('price-chart-no-data')).toBeOnTheScreen();
      expect(getByTestId('price-chart-no-data-icon')).toBeOnTheScreen();
    });

    it('shows simplified message when there is only 1 data point', () => {
      const singleDataPoint: TokenPrice[] = [['1736761237983', 100]];

      const { getByText, queryByText, getByTestId } = render(
        <PriceChart {...defaultProps} prices={singleDataPoint} />,
      );

      // Should show insufficient data overlay
      expect(getByTestId('price-chart-insufficient-data')).toBeOnTheScreen();

      // Should show insufficient data message
      expect(
        getByText('Data is not available for this time period'),
      ).toBeOnTheScreen();

      // Should NOT show full description
      expect(
        queryByText('We could not fetch any data for this token'),
      ).not.toBeOnTheScreen();

      // Should NOT show title as a Title component
      expect(queryByText('No chart data')).not.toBeOnTheScreen();
    });

    it('does not show overlay when there are 2 data points', () => {
      const validDataPoints: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 105],
      ];

      const { queryByText } = render(
        <PriceChart {...defaultProps} prices={validDataPoints} />,
      );

      // Should NOT show any overlay messages
      expect(queryByText('No chart data')).not.toBeOnTheScreen();
      expect(
        queryByText('We could not fetch any data for this token'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('Data is not available for this time period'),
      ).not.toBeOnTheScreen();
    });

    it('does not show overlay when there are multiple data points', () => {
      const multipleDataPoints: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 105],
        ['1736761237989', 110],
        ['1736761237992', 108],
      ];

      const { queryByText } = render(
        <PriceChart {...defaultProps} prices={multipleDataPoints} />,
      );

      // Should NOT show any overlay messages
      expect(queryByText('No chart data')).not.toBeOnTheScreen();
      expect(
        queryByText('We could not fetch any data for this token'),
      ).not.toBeOnTheScreen();
      expect(
        queryByText('Data is not available for this time period'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Loading state', () => {
    it('shows loading overlay when isLoading is true', () => {
      const { getByTestId } = render(
        <PriceChart {...defaultProps} isLoading />,
      );

      // Should render loading overlay
      expect(getByTestId('price-chart-loading')).toBeOnTheScreen();
    });

    it('does not show no data overlay when loading', () => {
      const { queryByText } = render(
        <PriceChart {...defaultProps} prices={[]} isLoading />,
      );

      // Should NOT show no data messages when loading
      expect(queryByText('No chart data')).not.toBeOnTheScreen();
      expect(
        queryByText('We could not fetch any data for this token'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Chart rendering', () => {
    it('renders chart with positive price difference', () => {
      const prices: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 105],
      ];

      const { getByTestId } = render(
        <PriceChart {...defaultProps} prices={prices} priceDiff={5} />,
      );

      // Should render AreaChart
      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });

    it('renders chart with negative price difference', () => {
      const prices: TokenPrice[] = [
        ['1736761237983', 105],
        ['1736761237986', 100],
      ];

      const { getByTestId } = render(
        <PriceChart {...defaultProps} prices={prices} priceDiff={-5} />,
      );

      // Should render AreaChart
      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });
  });
});
