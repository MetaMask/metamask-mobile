import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PriceChart from './PriceChart';
import { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { PriceChartProvider } from './PriceChart.context';

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

      // Should render no data overlay (without icon in new design)
      expect(getByTestId('price-chart-no-data')).toBeOnTheScreen();
    });

    it('shows same overlay when there is only 1 data point', () => {
      const singleDataPoint: TokenPrice[] = [['1736761237983', 100]];

      const { getByText, getByTestId } = render(
        <PriceChart {...defaultProps} prices={singleDataPoint} />,
      );

      // Should show insufficient data overlay with same design as empty data
      expect(getByTestId('price-chart-insufficient-data')).toBeOnTheScreen();

      // Should show same title and description as empty state
      expect(getByText('No chart data')).toBeOnTheScreen();
      expect(
        getByText('We could not fetch any data for this token'),
      ).toBeOnTheScreen();
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

    it('renders chart with zero price difference using alternative color', () => {
      const prices: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 100],
      ];

      const { getByTestId } = render(
        <PriceChart {...defaultProps} prices={prices} priceDiff={0} />,
      );

      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });
  });

  describe('Stablecoin range prices', () => {
    it('renders chart with stablecoin-range prices including flat values', () => {
      const stablecoinPrices: TokenPrice[] = [
        ['1736761237983', 1.0],
        ['1736761237986', 1.0],
        ['1736761237989', 1.0],
        ['1736761237992', 1.0],
      ];

      const { getByTestId } = render(
        <PriceChart
          {...defaultProps}
          prices={stablecoinPrices}
          priceDiff={0}
        />,
      );

      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });
  });

  describe('EndDot', () => {
    it('renders end dot at the last data point', () => {
      const prices: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 105],
      ];

      const result = render(
        <PriceChart {...defaultProps} prices={prices} priceDiff={5} />,
      );

      // AreaChart only renders SVG children after its inner View receives
      // a layout event (setting width/height > 0). Simulate that here.
      const chartArea = result.getByTestId('price-chart-area');
      const areaChartLayoutView = chartArea.findAll(
        (node) => typeof node.props?.onLayout === 'function',
      );
      areaChartLayoutView.forEach((v) =>
        fireEvent(v, 'layout', {
          nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
        }),
      );

      expect(result.getByTestId('price-chart-end-dot')).toBeOnTheScreen();
    });
  });

  describe('Touch interactions', () => {
    /**
     * Synthetic responder event with the touchHistory shape
     * that PanResponder's internal state machine expects.
     */
    const createResponderEvent = (locationX: number, locationY: number) => {
      const timestamp = Date.now();
      return {
        nativeEvent: {
          locationX,
          locationY,
          pageX: locationX,
          pageY: locationY,
          identifier: 1,
          target: 0,
          timestamp,
        },
        touchHistory: {
          indexOfSingleActiveTouch: 0,
          mostRecentTimeStamp: timestamp,
          numberActiveTouches: 1,
          touchBank: [
            {
              touchActive: true,
              startPageX: locationX,
              startPageY: locationY,
              startTimeStamp: timestamp,
              currentPageX: locationX,
              currentPageY: locationY,
              currentTimeStamp: timestamp,
              previousPageX: locationX,
              previousPageY: locationY,
              previousTimeStamp: timestamp,
            },
          ],
        },
      };
    };

    it('calls onChartIndexChange for each gesture in a grant, move, release cycle', () => {
      const prices: TokenPrice[] = [
        ['1736761237983', 100],
        ['1736761237986', 105],
        ['1736761237989', 110],
        ['1736761237992', 108],
      ];

      const { getByTestId } = render(
        <PriceChartProvider>
          <PriceChart {...defaultProps} prices={prices} priceDiff={8} />
        </PriceChartProvider>,
      );

      const chartArea = getByTestId('price-chart-area');

      // Initial touch
      fireEvent(chartArea, 'responderGrant', createResponderEvent(50, 50));
      expect(mockOnChartIndexChange).toHaveBeenCalledTimes(1);

      // Move/Drag
      fireEvent(chartArea, 'responderMove', createResponderEvent(200, 55));
      expect(mockOnChartIndexChange).toHaveBeenCalledTimes(2);

      // Release
      fireEvent(chartArea, 'responderRelease', createResponderEvent(200, 55));
      expect(mockOnChartIndexChange).toHaveBeenCalledTimes(3);
    });
  });
});
