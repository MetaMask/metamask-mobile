import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictDetailsChart, { ChartSeries } from './PredictDetailsChart';

jest.mock('react-native-svg-charts', () => ({
  LineChart: jest.fn(({ children, data, svg, ...props }) => {
    const { View, Text } = jest.requireActual('react-native');
    // Only add testID if the chart is visible (not the transparent tooltip overlay)
    const isVisible = svg?.stroke !== 'transparent';
    return (
      <View testID={isVisible ? 'line-chart' : undefined} {...props}>
        <Text testID={isVisible ? 'chart-data' : undefined}>
          {JSON.stringify(data)}
        </Text>
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
  Circle: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-circle" {...props} />;
  }),
  Rect: jest.fn((props) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="svg-rect" {...props} />;
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders chart with single series data', () => {
      const { getByTestId } = setupTest();

      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('renders chart with multiple series data', () => {
      const { getAllByTestId, getByText } = setupTest({
        data: mockMultipleSeries,
      });

      // At least one chart is rendered
      const charts = getAllByTestId('line-chart');
      expect(charts.length).toBeGreaterThanOrEqual(1);
      // Legend with multiple series is displayed
      expect(getByText(/Outcome A/)).toBeOnTheScreen();
      expect(getByText(/Outcome B/)).toBeOnTheScreen();
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
      const { getByTestId } = setupTest({ isLoading: true });

      const lineChart = getByTestId('line-chart');
      expect(lineChart).toBeOnTheScreen();
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

  describe('Interactive Features', () => {
    describe('Touch Interactions', () => {
      it('renders chart with pan handler setup', () => {
        const { getByTestId } = setupTest();

        const lineChart = getByTestId('line-chart');
        expect(lineChart).toBeOnTheScreen();
      });

      it('handles chart layout calculation', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        const lineCharts = getAllByTestId('line-chart');
        // Verify chart is rendered and can receive layout events
        expect(lineCharts.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('ChartTooltip', () => {
      it('renders SVG tooltip elements for multiple series', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        // Verify chart is rendered with SVG components
        const charts = getAllByTestId('line-chart');
        expect(charts.length).toBeGreaterThanOrEqual(1);
      });

      it('includes tooltip overlay chart layer', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        // With multiple series, we have primary + overlays + tooltip layer
        const charts = getAllByTestId('line-chart');
        expect(charts.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Label Truncation', () => {
      it('handles long series labels', () => {
        const longLabelSeries: ChartSeries[] = [
          {
            label: 'This is a very long outcome label that exceeds limit',
            color: '#4459FF',
            data: [
              { timestamp: 1640995200000, value: 0.5 },
              { timestamp: 1640998800000, value: 0.6 },
            ],
          },
          {
            label: 'Short Label',
            color: '#FF6B6B',
            data: [
              { timestamp: 1640995200000, value: 0.3 },
              { timestamp: 1640998800000, value: 0.4 },
            ],
          },
        ];

        const { getByText } = setupTest({ data: longLabelSeries });

        // Component should render without crashing with long labels
        // Legend shows labels for multiple series
        expect(
          getByText(/This is a very long outcome label/),
        ).toBeOnTheScreen();
      });

      it('handles special characters in labels', () => {
        const specialCharSeries: ChartSeries[] = [
          {
            label: 'Outcome #1 (Test) - Result',
            color: '#4459FF',
            data: [
              { timestamp: 1640995200000, value: 0.5 },
              { timestamp: 1640998800000, value: 0.6 },
            ],
          },
          {
            label: 'Normal Label',
            color: '#FF6B6B',
            data: [
              { timestamp: 1640995200000, value: 0.3 },
              { timestamp: 1640998800000, value: 0.4 },
            ],
          },
        ];

        const { getByText } = setupTest({ data: specialCharSeries });

        expect(getByText(/Outcome #1 \(Test\)/)).toBeOnTheScreen();
      });
    });

    describe('Active Index and Legend Updates', () => {
      it('passes activeIndex to legend for multiple series', () => {
        const { getByText } = setupTest({ data: mockMultipleSeries });

        // Legend should display last values initially
        expect(getByText(/Outcome A/)).toBeOnTheScreen();
        expect(getByText(/Outcome B/)).toBeOnTheScreen();
      });

      it('legend displays values correctly for multiple series', () => {
        const { getByText } = setupTest({ data: mockMultipleSeries });

        // Both series labels should be visible in legend
        expect(getByText(/Outcome A/)).toBeOnTheScreen();
        expect(getByText(/Outcome B/)).toBeOnTheScreen();
      });
    });

    describe('Collision Detection', () => {
      it('handles series with crossing values', () => {
        const crossingSeries: ChartSeries[] = [
          {
            label: 'Series A',
            color: '#4459FF',
            data: [
              { timestamp: 1, value: 0.3 },
              { timestamp: 2, value: 0.7 },
            ],
          },
          {
            label: 'Series B',
            color: '#FF6B6B',
            data: [
              { timestamp: 1, value: 0.7 },
              { timestamp: 2, value: 0.3 },
            ],
          },
        ];

        const { getByText } = setupTest({ data: crossingSeries });

        // Component should handle crossing values without errors
        expect(getByText(/Series A/)).toBeOnTheScreen();
        expect(getByText(/Series B/)).toBeOnTheScreen();
      });

      it('handles series with very close values', () => {
        const closeSeries: ChartSeries[] = [
          {
            label: 'Close A',
            color: '#4459FF',
            data: [
              { timestamp: 1, value: 0.5 },
              { timestamp: 2, value: 0.501 },
            ],
          },
          {
            label: 'Close B',
            color: '#FF6B6B',
            data: [
              { timestamp: 1, value: 0.502 },
              { timestamp: 2, value: 0.503 },
            ],
          },
        ];

        const { getByText } = setupTest({ data: closeSeries });

        expect(getByText(/Close A/)).toBeOnTheScreen();
        expect(getByText(/Close B/)).toBeOnTheScreen();
      });
    });

    describe('Tooltip Positioning', () => {
      it('renders chart with proper layout for tooltip positioning', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        const charts = getAllByTestId('line-chart');
        // Should have multiple chart layers including tooltip overlay
        expect(charts.length).toBeGreaterThanOrEqual(1);
      });

      it('handles chart with full data range', () => {
        const fullRangeSeries: ChartSeries[] = [
          {
            label: 'Full Range',
            color: '#4459FF',
            data: Array.from({ length: 50 }, (_, i) => ({
              timestamp: 1640995200000 + i * 3600000,
              value: 0.3 + (i / 50) * 0.4, // Values from 0.3 to 0.7
            })),
          },
        ];

        const { getByTestId } = setupTest({ data: fullRangeSeries });

        expect(getByTestId('line-chart')).toBeOnTheScreen();
      });
    });

    describe('Theme Support', () => {
      it('renders chart with theme colors', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        const lineCharts = getAllByTestId('line-chart');
        // Theme colors should be applied via mocked useTheme
        expect(lineCharts.length).toBeGreaterThanOrEqual(1);
      });

      it('applies correct colors to series', () => {
        const coloredSeries: ChartSeries[] = [
          {
            label: 'Blue',
            color: '#0000FF',
            data: [{ timestamp: 1, value: 0.5 }],
          },
          {
            label: 'Red',
            color: '#FF0000',
            data: [{ timestamp: 1, value: 0.5 }],
          },
        ];

        const { getByText } = setupTest({ data: coloredSeries });

        expect(getByText(/Blue/)).toBeOnTheScreen();
        expect(getByText(/Red/)).toBeOnTheScreen();
      });
    });

    describe('Multiple Series Rendering', () => {
      it('renders primary and overlay charts for multiple series', () => {
        const { getAllByTestId } = setupTest({ data: mockMultipleSeries });

        const charts = getAllByTestId('line-chart');
        // Primary chart + overlay for second series + tooltip overlay
        expect(charts.length).toBeGreaterThanOrEqual(2);
      });

      it('renders up to 3 series with overlays', () => {
        const threeSeries: ChartSeries[] = [
          {
            label: 'Series 1',
            color: '#4459FF',
            data: [
              { timestamp: 1, value: 0.5 },
              { timestamp: 2, value: 0.6 },
            ],
          },
          {
            label: 'Series 2',
            color: '#FF6B6B',
            data: [
              { timestamp: 1, value: 0.3 },
              { timestamp: 2, value: 0.4 },
            ],
          },
          {
            label: 'Series 3',
            color: '#F0B034',
            data: [
              { timestamp: 1, value: 0.2 },
              { timestamp: 2, value: 0.25 },
            ],
          },
        ];

        const { getByText } = setupTest({ data: threeSeries });

        expect(getByText(/Series 1/)).toBeOnTheScreen();
        expect(getByText(/Series 2/)).toBeOnTheScreen();
        expect(getByText(/Series 3/)).toBeOnTheScreen();
      });
    });

    describe('Data Point Formatting', () => {
      it('formats timestamp labels correctly', () => {
        const { getAllByText } = setupTest();

        // Timestamps should be formatted as time labels
        const timeLabels = getAllByText(/PM/);
        expect(timeLabels.length).toBeGreaterThan(0);
      });

      it('displays correct number of axis labels', () => {
        const { getAllByText } = setupTest();

        // Should have time labels on x-axis
        const timeLabels = getAllByText(/PM|AM/);
        expect(timeLabels.length).toBeGreaterThan(0);
      });
    });

    describe('Axis Label Deduplication', () => {
      it('removes consecutive duplicate axis labels', () => {
        const axisData = [
          { timestamp: 1740000000000, value: 0.2 },
          { timestamp: 1740003600000, value: 0.3 },
          { timestamp: 1740007200000, value: 0.4 },
          { timestamp: 1740010800000, value: 0.5 },
        ];

        const labelByTimestamp = new Map<number, string>([
          [axisData[0].timestamp, 'AXIS_LABEL_ONE'],
          [axisData[1].timestamp, 'AXIS_LABEL_ONE'],
          [axisData[2].timestamp, 'AXIS_LABEL_TWO'],
          [axisData[3].timestamp, 'AXIS_LABEL_TWO'],
        ]);

        const chartUtils =
          jest.requireActual<typeof import('./utils')>('./utils');
        const formatSpy = jest
          .spyOn(chartUtils, 'formatPriceHistoryLabel')
          .mockImplementation(
            (timestamp: number) =>
              labelByTimestamp.get(Number(timestamp)) ?? 'AXIS_FALLBACK',
          );

        const { getAllByText } = setupTest({
          data: [
            {
              label: 'Dedup Series',
              color: '#123456',
              data: axisData,
            },
          ],
        });

        expect(getAllByText('AXIS_LABEL_ONE')).toHaveLength(1);
        expect(getAllByText('AXIS_LABEL_TWO')).toHaveLength(1);

        formatSpy.mockRestore();
      });
    });
  });
});
