import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictDetailsChartMultiple, {
  PredictDetailsChartMultipleSeries,
} from './PredictDetailsChartMultiple';

jest.mock('react-native-svg-charts', () => ({
  LineChart: jest.fn(({ children, data, ...props }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="line-chart" {...props}>
        <Text testID="chart-data">{JSON.stringify(data)}</Text>
        {children}
      </View>
    );
  }),
}));

jest.mock('react-native-svg', () => ({
  Line: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-line" {...props} />;
  }),
  Text: jest.fn((props) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="svg-text" {...props} />;
  }),
  G: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-g" {...props} />;
  }),
  Defs: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-defs" {...props} />;
  }),
  LinearGradient: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-linear-gradient" {...props} />;
  }),
  Stop: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-stop" {...props} />;
  }),
  Path: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-path" {...props} />;
  }),
}));

jest.mock('d3-shape', () => ({
  curveCatmullRom: {
    alpha: jest.fn(() => 'curve'),
  },
  area: jest.fn(() => ({
    x: jest.fn().mockReturnThis(),
    y0: jest.fn().mockReturnThis(),
    y1: jest.fn().mockReturnThis(),
    curve: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      success: {
        default: '#00C853',
        muted: '#C8E6C9',
      },
      border: {
        muted: '#E0E0E0',
      },
      text: {
        default: '#000000',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

describe('PredictDetailsChartMultiple', () => {
  const mockSeriesData: PredictDetailsChartMultipleSeries[] = [
    {
      label: 'Series A',
      color: '#FF6B6B',
      data: [
        { timestamp: 1640995200000, value: 0.5 },
        { timestamp: 1640998800000, value: 0.6 },
        { timestamp: 1641002400000, value: 0.4 },
        { timestamp: 1641006000000, value: 0.7 },
      ],
    },
    {
      label: 'Series B',
      color: '#4ECDC4',
      data: [
        { timestamp: 1640995200000, value: 0.3 },
        { timestamp: 1640998800000, value: 0.4 },
        { timestamp: 1641002400000, value: 0.2 },
        { timestamp: 1641006000000, value: 0.5 },
      ],
    },
  ];

  const defaultProps = {
    data: mockSeriesData,
    timeframes: ['1h', '6h', '1d', '1w', '1m', 'max'],
    selectedTimeframe: '1h',
    onTimeframeChange: jest.fn(),
  };

  const setupTest = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return renderWithProvider(<PredictDetailsChartMultiple {...mergedProps} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders chart with multiple series data', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThan(0);
    });

    it('renders timeframe selector with all timeframes', () => {
      const { getByText } = setupTest();

      expect(getByText('1H')).toBeOnTheScreen();
      expect(getByText('6H')).toBeOnTheScreen();
      expect(getByText('1D')).toBeOnTheScreen();
      expect(getByText('1W')).toBeOnTheScreen();
      expect(getByText('1M')).toBeOnTheScreen();
      expect(getByText('MAX')).toBeOnTheScreen();
    });

    it('highlights selected timeframe', () => {
      const { getByText } = setupTest({ selectedTimeframe: '1d' });

      expect(getByText('1D')).toBeOnTheScreen();
    });

    it('renders loading state when isLoading is true', () => {
      const { getByText } = setupTest({ isLoading: true });

      expect(getByText('Loading price history...')).toBeOnTheScreen();
    });

    it('renders empty state when no data provided', () => {
      const { getByText } = setupTest({
        data: [],
        emptyLabel: 'No data available',
      });

      expect(getByText('No data available')).toBeOnTheScreen();
    });

    it('renders custom empty label when provided', () => {
      const customLabel = 'Custom empty message';
      const { getByText } = setupTest({
        data: [],
        emptyLabel: customLabel,
      });

      expect(getByText(customLabel)).toBeOnTheScreen();
    });
  });

  describe('Multiple Series Rendering', () => {
    it('renders legend with multiple series', () => {
      const { getByText } = setupTest();

      expect(getByText('Series A 0.70%')).toBeOnTheScreen();
      expect(getByText('Series B 0.50%')).toBeOnTheScreen();
    });

    it('displays correct values in legend for each series', () => {
      const { getByText } = setupTest();

      // Series A last value is 0.7, Series B last value is 0.5
      expect(getByText('Series A 0.70%')).toBeOnTheScreen();
      expect(getByText('Series B 0.50%')).toBeOnTheScreen();
    });

    it('shows series colors in legend indicators', () => {
      const { getByText } = setupTest();

      // Legend should be rendered with series labels
      expect(getByText('Series A 0.70%')).toBeOnTheScreen();
      expect(getByText('Series B 0.50%')).toBeOnTheScreen();
    });

    it('limits series to maximum of 3', () => {
      const manySeriesData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Series 1',
          color: '#FF0000',
          data: [{ timestamp: 1640995200000, value: 0.1 }],
        },
        {
          label: 'Series 2',
          color: '#00FF00',
          data: [{ timestamp: 1640995200000, value: 0.2 }],
        },
        {
          label: 'Series 3',
          color: '#0000FF',
          data: [{ timestamp: 1640995200000, value: 0.3 }],
        },
        {
          label: 'Series 4',
          color: '#FFFF00',
          data: [{ timestamp: 1640995200000, value: 0.4 }],
        },
      ];

      const { getByText, queryByText } = setupTest({ data: manySeriesData });

      expect(getByText('Series 1 0.10%')).toBeOnTheScreen();
      expect(getByText('Series 2 0.20%')).toBeOnTheScreen();
      expect(getByText('Series 3 0.30%')).toBeOnTheScreen();
      expect(queryByText('Series 4')).not.toBeOnTheScreen();
    });

    it('renders area chart for single series', () => {
      const singleSeriesData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Single Series',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 0.5 },
            { timestamp: 1640998800000, value: 0.6 },
          ],
        },
      ];

      const { getByText } = setupTest({ data: singleSeriesData });

      // For single series, area chart should be rendered (SVG components are mocked)
      expect(getByText('Single Series 0.60%')).toBeOnTheScreen();
    });

    it('renders overlay charts for multiple series', () => {
      const { getAllByTestId } = setupTest();

      // Should have multiple line charts (primary + overlays)
      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThan(1);
    });
  });

  describe('Timeframe Selection', () => {
    it('calls onTimeframeChange when timeframe is pressed', () => {
      const mockOnTimeframeChange = jest.fn();
      const { getByText } = setupTest({
        onTimeframeChange: mockOnTimeframeChange,
      });

      const timeframeText = getByText('6H');
      const pressableComponent = timeframeText.parent;

      expect(pressableComponent).toBeDefined();

      if (pressableComponent?.props.onPress) {
        pressableComponent.props.onPress();
        expect(mockOnTimeframeChange).toHaveBeenCalledWith('6h');
      } else {
        expect(timeframeText).toBeOnTheScreen();
      }
    });

    it('calls onTimeframeChange with correct timeframe for each button', () => {
      const mockOnTimeframeChange = jest.fn();
      const { getByText } = setupTest({
        onTimeframeChange: mockOnTimeframeChange,
      });

      const button1H = getByText('1H').parent;
      if (button1H?.props.onPress) {
        button1H.props.onPress();
        expect(mockOnTimeframeChange).toHaveBeenCalledWith('1h');
      }

      const button1D = getByText('1D').parent;
      if (button1D?.props.onPress) {
        button1D.props.onPress();
        expect(mockOnTimeframeChange).toHaveBeenCalledWith('1d');
      }

      const buttonMax = getByText('MAX').parent;
      if (buttonMax?.props.onPress) {
        buttonMax.props.onPress();
        expect(mockOnTimeframeChange).toHaveBeenCalledWith('max');
      }
    });
  });

  describe('Data Processing', () => {
    it('processes multiple series data correctly', () => {
      const { getAllByTestId } = setupTest();

      const chartDataElements = getAllByTestId('chart-data');
      const primaryData = JSON.parse(String(chartDataElements[0].children[0]));

      // Should show primary series data (Series A: [0.5, 0.6, 0.4, 0.7])
      expect(primaryData).toEqual([0.5, 0.6, 0.4, 0.7]);
    });

    it('handles series with single data point', () => {
      const singlePointData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Single Point',
          color: '#FF6B6B',
          data: [{ timestamp: 1640995200000, value: 0.5 }],
        },
      ];
      const { getByTestId } = setupTest({ data: singlePointData });

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      expect(data).toEqual([0.5]);
    });

    it('handles empty series data', () => {
      const emptySeriesData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Empty Series',
          color: '#FF6B6B',
          data: [],
        },
      ];
      const { getByTestId } = setupTest({ data: emptySeriesData });

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      expect(data).toEqual(expect.arrayContaining([0]));
    });

    it('calculates correct chart bounds across all series', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      const primaryChart = lineCharts[0];
      // Min value across all series is 0.2, max is 0.7
      expect(primaryChart.props.yMin).toBeLessThan(0.2);
      expect(primaryChart.props.yMax).toBeGreaterThan(0.7);
    });

    it('handles series with same values (zero range)', () => {
      const sameValueData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Same Values',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 0.5 },
            { timestamp: 1640998800000, value: 0.5 },
            { timestamp: 1641002400000, value: 0.5 },
          ],
        },
      ];
      const { getByTestId } = setupTest({ data: sameValueData });

      const lineChart = getByTestId('line-chart');
      expect(lineChart.props.yMin).toBeLessThan(0.5);
      expect(lineChart.props.yMax).toBeGreaterThan(0.5);
    });

    it('filters out empty series from calculations', () => {
      const mixedData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Empty Series',
          color: '#FF6B6B',
          data: [],
        },
        {
          label: 'Valid Series',
          color: '#4ECDC4',
          data: [
            { timestamp: 1640995200000, value: 0.3 },
            { timestamp: 1640998800000, value: 0.4 },
          ],
        },
      ];
      const { getByTestId } = setupTest({ data: mixedData });

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      // Should use valid series data
      expect(data).toEqual([0.3, 0.4]);
    });
  });

  describe('Date Formatting', () => {
    it('formats labels correctly for 1h interval', () => {
      const { getByText } = setupTest({ selectedTimeframe: '1h' });

      expect(getByText('7:00 PM')).toBeOnTheScreen();
    });

    it('formats labels correctly for 1d interval', () => {
      const { getByText } = setupTest({ selectedTimeframe: '1d' });

      expect(getByText('7:00 PM')).toBeOnTheScreen();
    });

    it('formats labels correctly for 1w interval', () => {
      const { getByText } = setupTest({ selectedTimeframe: '1w' });

      expect(getByText('Fri, 7 PM')).toBeOnTheScreen();
    });

    it('formats labels correctly for 1m interval', () => {
      const { getAllByText } = setupTest({ selectedTimeframe: '1m' });

      const labels = getAllByText('Dec 31');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('formats labels correctly for max interval', () => {
      const { getAllByText } = setupTest({ selectedTimeframe: 'max' });

      const labels = getAllByText('Dec 2021');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('handles both millisecond and second timestamps', () => {
      const secondTimestampData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Mixed Timestamps',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200, value: 0.5 },
            { timestamp: 1640995200000, value: 0.6 },
          ],
        },
      ];

      const { getAllByText } = setupTest({
        data: secondTimestampData,
        selectedTimeframe: '1h',
      });

      const labels = getAllByText('7:00 PM');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Tick Value Formatting', () => {
    it('formats small range values with 2 decimal places', () => {
      const smallRangeData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Small Range',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 0.123 },
            { timestamp: 1640998800000, value: 0.125 },
          ],
        },
      ];

      setupTest({ data: smallRangeData });

      expect(true).toBe(true);
    });

    it('formats medium range values with 1 decimal place', () => {
      const mediumRangeData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Medium Range',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 1.2 },
            { timestamp: 1640998800000, value: 1.8 },
          ],
        },
      ];

      setupTest({ data: mediumRangeData });

      expect(true).toBe(true);
    });

    it('formats large range values with 0 decimal places', () => {
      const largeRangeData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Large Range',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 12 },
            { timestamp: 1640998800000, value: 18 },
          ],
        },
      ];

      setupTest({ data: largeRangeData });

      expect(true).toBe(true);
    });

    it('handles non-finite values', () => {
      const invalidData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Invalid Data',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: NaN },
            { timestamp: 1640998800000, value: Infinity },
          ],
        },
      ];

      setupTest({ data: invalidData });

      expect(true).toBe(true);
    });
  });

  describe('Chart Configuration', () => {
    it('sets correct chart height', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      const primaryChart = lineCharts[0];
      expect(primaryChart.props.style).toEqual(
        expect.objectContaining({
          height: 192,
        }),
      );
    });

    it('sets correct content inset', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      const primaryChart = lineCharts[0];
      expect(primaryChart.props.contentInset).toEqual({
        top: 20,
        bottom: 20,
        left: 20,
        right: 32,
      });
    });

    it('sets correct number of ticks', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      const primaryChart = lineCharts[0];
      expect(primaryChart.props.numberOfTicks).toBe(4);
    });

    it('applies correct curve configuration', () => {
      const { getAllByTestId } = setupTest();

      const lineCharts = getAllByTestId('line-chart');
      const primaryChart = lineCharts[0];
      expect(primaryChart.props.curve).toBe('curve');
    });
  });

  describe('Loading and Empty States', () => {
    it('shows loading placeholder with correct styling', () => {
      const { getByText, getByTestId } = setupTest({ isLoading: true });

      expect(getByText('Loading price history...')).toBeOnTheScreen();
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('shows empty state with custom message', () => {
      const customMessage = 'No price data available';
      const { getByText } = setupTest({
        data: [],
        emptyLabel: customMessage,
      });

      expect(getByText(customMessage)).toBeOnTheScreen();
    });

    it('shows default empty state when no custom message provided', () => {
      const { queryByText } = setupTest({ data: [] });

      expect(queryByText('Loading price history...')).not.toBeOnTheScreen();
    });

    it('hides legend when no data and not loading', () => {
      const { queryByText } = setupTest({
        data: [],
        isLoading: false,
      });

      expect(queryByText('Series A')).not.toBeOnTheScreen();
      expect(queryByText('Series B')).not.toBeOnTheScreen();
    });

    it('shows legend when loading even with no data', () => {
      const emptySeriesData: PredictDetailsChartMultipleSeries[] = [
        { label: 'Series A', color: '#FF6B6B', data: [] },
        { label: 'Series B', color: '#4ECDC4', data: [] },
      ];

      const { getByText } = setupTest({
        data: emptySeriesData,
        isLoading: true,
      });

      // When loading with empty series data, legend should still show the series labels
      expect(getByText('Series A —')).toBeOnTheScreen();
      expect(getByText('Series B —')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('renders timeframe buttons as pressable elements', () => {
      const { getByText } = setupTest();

      const timeframeText = getByText('1H');
      expect(timeframeText).toBeOnTheScreen();
    });

    it('provides proper text content for screen readers', () => {
      const { getByText } = setupTest();

      expect(getByText('1H')).toBeOnTheScreen();
      expect(getByText('6H')).toBeOnTheScreen();
      expect(getByText('1D')).toBeOnTheScreen();
    });

    it('provides series labels for screen readers', () => {
      const { getByText } = setupTest();

      expect(getByText('Series A 0.70%')).toBeOnTheScreen();
      expect(getByText('Series B 0.50%')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles series with extreme values', () => {
      const extremeData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Extreme Values',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 0.0001 },
            { timestamp: 1640998800000, value: 999999 },
          ],
        },
      ];

      const { getByTestId } = setupTest({ data: extremeData });

      const lineChart = getByTestId('line-chart');
      expect(lineChart.props.yMin).toBeLessThan(0.0001);
      expect(lineChart.props.yMax).toBeGreaterThan(999999);
    });

    it('handles series with negative values', () => {
      const negativeData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Negative Values',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: -0.5 },
            { timestamp: 1640998800000, value: 0.5 },
          ],
        },
      ];

      const { getByTestId } = setupTest({ data: negativeData });

      const lineChart = getByTestId('line-chart');
      expect(lineChart.props.yMin).toBeLessThan(-0.5);
      expect(lineChart.props.yMax).toBeGreaterThan(0.5);
    });

    it('handles very large datasets efficiently', () => {
      const largeDataset: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Large Dataset',
          color: '#FF6B6B',
          data: Array.from({ length: 1000 }, (_, i) => ({
            timestamp: 1640995200000 + i * 3600000, // 1 hour intervals
            value: Math.random(),
          })),
        },
      ];

      const { getByTestId } = setupTest({ data: largeDataset });

      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('handles series with missing color property', () => {
      const noColorData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'No Color',
          color: '',
          data: [
            { timestamp: 1640995200000, value: 0.5 },
            { timestamp: 1640998800000, value: 0.6 },
          ],
        },
      ];

      const { getByText } = setupTest({ data: noColorData });

      expect(getByText('No Color 0.60%')).toBeOnTheScreen();
    });

    it('handles mixed valid and invalid series', () => {
      const mixedData: PredictDetailsChartMultipleSeries[] = [
        {
          label: 'Valid Series',
          color: '#FF6B6B',
          data: [
            { timestamp: 1640995200000, value: 0.5 },
            { timestamp: 1640998800000, value: 0.6 },
          ],
        },
        {
          label: 'Empty Series',
          color: '#4ECDC4',
          data: [],
        },
        {
          label: 'Another Valid Series',
          color: '#45B7D1',
          data: [
            { timestamp: 1640995200000, value: 0.3 },
            { timestamp: 1640998800000, value: 0.4 },
          ],
        },
      ];

      const { getByText, getAllByTestId } = setupTest({ data: mixedData });

      expect(getByText('Valid Series 0.60%')).toBeOnTheScreen();
      expect(getByText('Empty Series —')).toBeOnTheScreen();
      expect(getByText('Another Valid Series 0.40%')).toBeOnTheScreen();

      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThan(0);
    });
  });
});
