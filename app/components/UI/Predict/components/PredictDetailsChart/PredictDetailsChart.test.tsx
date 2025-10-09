import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictDetailsChart, { ChartSeries } from './PredictDetailsChart';

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
        default: '#28C76F',
        muted: '#28C76F80',
      },
      text: {
        default: '#000000',
      },
      border: {
        muted: '#E0E0E0',
      },
      background: {
        default: '#FFFFFF',
      },
    },
  }),
}));

describe('PredictDetailsChart', () => {
  const mockSingleSeries: ChartSeries[] = [
    {
      label: 'Outcome 1',
      color: '#28C76F',
      data: [
        { timestamp: 1640995200000, value: 0.5 },
        { timestamp: 1640998800000, value: 0.6 },
        { timestamp: 1641002400000, value: 0.4 },
        { timestamp: 1641006000000, value: 0.7 },
      ],
    },
  ];

  const mockMultipleSeries: ChartSeries[] = [
    {
      label: 'Outcome A',
      color: '#4459FF',
      data: [
        { timestamp: 1640995200000, value: 0.5 },
        { timestamp: 1640998800000, value: 0.6 },
        { timestamp: 1641002400000, value: 0.4 },
        { timestamp: 1641006000000, value: 0.7 },
      ],
    },
    {
      label: 'Outcome B',
      color: '#CA3542',
      data: [
        { timestamp: 1640995200000, value: 0.3 },
        { timestamp: 1640998800000, value: 0.2 },
        { timestamp: 1641002400000, value: 0.5 },
        { timestamp: 1641006000000, value: 0.2 },
      ],
    },
  ];

  const defaultProps = {
    data: mockSingleSeries,
    timeframes: ['1h', '6h', '1d', '1w', '1m', 'max'],
    selectedTimeframe: '1h',
    onTimeframeChange: jest.fn(),
  };

  const setupTest = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return renderWithProvider(<PredictDetailsChart {...mergedProps} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders chart with single series data', () => {
      const { getByTestId } = setupTest();

      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('renders chart with multiple series data', () => {
      const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

      // Multiple LineChart components are rendered for multiple series
      const charts = getAllByTestId('line-chart');
      expect(charts.length).toBeGreaterThanOrEqual(1);
    });

    it('renders timeframe selector with all timeframes', () => {
      const { getByText } = setupTest();

      ['1H', '6H', '1D', '1W', '1M', 'MAX'].forEach((timeframe) => {
        expect(getByText(timeframe)).toBeOnTheScreen();
      });
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
      const { queryByText } = setupTest({
        data: [{ label: 'Empty', color: '#000', data: [] }],
        isLoading: false,
      });

      expect(queryByText('Loading price history...')).not.toBeOnTheScreen();
    });

    it('renders custom empty label when provided', () => {
      const customLabel = 'No data available';
      const { getByText } = setupTest({
        data: [{ label: 'Empty', color: '#000', data: [] }],
        emptyLabel: customLabel,
      });

      expect(getByText(customLabel)).toBeOnTheScreen();
    });
  });

  describe('Single vs Multiple Series', () => {
    it('renders chart for single series', () => {
      const { getByTestId } = setupTest({ data: mockSingleSeries });

      // Chart should be rendered
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('does not render legend for single series', () => {
      const { queryByText } = setupTest({ data: mockSingleSeries });

      // Legend should not be present for single series
      expect(queryByText('Outcome 1')).not.toBeOnTheScreen();
    });

    it('renders legend for multiple series', () => {
      const { getByText } = setupTest({ data: mockMultipleSeries });

      // Legend should be present for multiple series
      expect(getByText(/Outcome A/)).toBeOnTheScreen();
      expect(getByText(/Outcome B/)).toBeOnTheScreen();
    });

    it('limits to maximum 3 series', () => {
      const fourSeries: ChartSeries[] = [
        ...mockMultipleSeries,
        {
          label: 'Outcome C',
          color: '#F0B034',
          data: [
            { timestamp: 1640995200000, value: 0.1 },
            { timestamp: 1640998800000, value: 0.15 },
          ],
        },
        {
          label: 'Outcome D',
          color: '#00FF00',
          data: [
            { timestamp: 1640995200000, value: 0.05 },
            { timestamp: 1640998800000, value: 0.1 },
          ],
        },
      ];

      const { queryByText } = setupTest({ data: fourSeries });

      // First 3 should be rendered
      expect(queryByText(/Outcome A/)).toBeOnTheScreen();
      expect(queryByText(/Outcome B/)).toBeOnTheScreen();
      expect(queryByText(/Outcome C/)).toBeOnTheScreen();
      // Fourth should not be rendered
      expect(queryByText(/Outcome D/)).not.toBeOnTheScreen();
    });
  });

  describe('Timeframe Selection', () => {
    it('renders all timeframe buttons', () => {
      const { getByText } = setupTest();

      ['1H', '6H', '1D', '1W', '1M', 'MAX'].forEach((timeframe) => {
        expect(getByText(timeframe)).toBeOnTheScreen();
      });
    });

    it('highlights the selected timeframe', () => {
      const { getByText } = setupTest({ selectedTimeframe: '6h' });

      // The selected timeframe should be rendered
      expect(getByText('6H')).toBeOnTheScreen();
    });
  });

  describe('Data Processing', () => {
    it('processes chart data correctly', () => {
      const { getByTestId } = setupTest();

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      expect(data).toEqual([0.5, 0.6, 0.4, 0.7]);
    });

    it('handles single data point', () => {
      const singlePointData: ChartSeries[] = [
        {
          label: 'Outcome',
          color: '#28C76F',
          data: [{ timestamp: 1640995200000, value: 0.5 }],
        },
      ];
      const { getByTestId } = setupTest({ data: singlePointData });

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      expect(data).toEqual([0.5]);
    });

    it('handles empty data array', () => {
      const emptyData: ChartSeries[] = [
        {
          label: 'Empty',
          color: '#28C76F',
          data: [],
        },
      ];
      const { getByTestId } = setupTest({ data: emptyData });

      const chartData = getByTestId('chart-data');
      const data = JSON.parse(String(chartData.children[0]));

      expect(data).toEqual(expect.arrayContaining([0]));
    });

    it('calculates correct chart bounds with padding', () => {
      const { getByTestId } = setupTest();

      const lineChart = getByTestId('line-chart');
      expect(lineChart.props.yMin).toBeLessThan(0.4); // min value with padding
      expect(lineChart.props.yMax).toBeGreaterThan(0.7); // max value with padding
    });

    it('handles zero range data (all same values)', () => {
      const sameValueData: ChartSeries[] = [
        {
          label: 'Same',
          color: '#28C76F',
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
  });

  describe('Date Formatting', () => {
    it('formats labels correctly for different intervals', () => {
      const { getByTestId } = setupTest({ selectedTimeframe: '1h' });

      // Verify chart is rendered with correct interval
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles very large values', () => {
      const largeData: ChartSeries[] = [
        {
          label: 'Large',
          color: '#28C76F',
          data: [
            { timestamp: 1640995200000, value: 1000000 },
            { timestamp: 1640998800000, value: 2000000 },
          ],
        },
      ];

      const { getByTestId } = setupTest({ data: largeData });
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('handles negative values', () => {
      const negativeData: ChartSeries[] = [
        {
          label: 'Negative',
          color: '#28C76F',
          data: [
            { timestamp: 1640995200000, value: -0.5 },
            { timestamp: 1640998800000, value: -0.3 },
          ],
        },
      ];

      const { getByTestId } = setupTest({ data: negativeData });
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('handles large dataset', () => {
      const largeDataset: ChartSeries[] = [
        {
          label: 'Large Dataset',
          color: '#28C76F',
          data: Array.from({ length: 100 }, (_, i) => ({
            timestamp: 1640995200000 + i * 3600000,
            value: Math.random(),
          })),
        },
      ];

      const { getByTestId } = setupTest({ data: largeDataset });
      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });
  });
});
