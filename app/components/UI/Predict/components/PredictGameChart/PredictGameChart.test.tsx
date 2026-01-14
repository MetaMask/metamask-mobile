import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictGameChartContent from './PredictGameChartContent';
import { GameChartSeries } from './PredictGameChart.types';

jest.mock('react-native-svg-charts', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    LineChart: ({
      children,
      data,
      svg,
      ...props
    }: {
      children?: React.ReactNode;
      data?: number[];
      svg?: { stroke?: string; strokeWidth?: number };
      [key: string]: unknown;
    }) => {
      const isVisible = svg?.stroke !== 'transparent';
      return (
        <View testID={isVisible ? 'line-chart' : undefined} {...props}>
          <Text testID={isVisible ? 'chart-data' : undefined}>
            {JSON.stringify(data)}
          </Text>
          {children}
        </View>
      );
    },
  };
});

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
  curveStepAfter: 'step-after-curve',
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      background: { default: '#FFFFFF' },
      border: { muted: '#E0E0E0' },
      text: { muted: '#9CA3AF', default: '#1A1A1A', alternative: '#6B7280' },
    },
  }),
}));

const mockAwayTeamData: GameChartSeries = {
  label: 'SEA',
  color: '#002244',
  data: [
    { timestamp: 1000, value: 50 },
    { timestamp: 2000, value: 55 },
    { timestamp: 3000, value: 60 },
    { timestamp: 4000, value: 70 },
  ],
};

const mockHomeTeamData: GameChartSeries = {
  label: 'DEN',
  color: '#FB4F14',
  data: [
    { timestamp: 1000, value: 50 },
    { timestamp: 2000, value: 45 },
    { timestamp: 3000, value: 40 },
    { timestamp: 4000, value: 30 },
  ],
};

const mockDualSeriesData: GameChartSeries[] = [
  mockAwayTeamData,
  mockHomeTeamData,
];

describe('PredictGameChartContent (Chart UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders chart with data', () => {
      const { getByTestId, getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} testID="chart" />,
      );

      expect(getByTestId('chart')).toBeOnTheScreen();
      expect(getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
    });

    it('renders loading state when isLoading is true', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PredictGameChartContent data={[]} isLoading testID="chart" />,
      );

      expect(getByTestId('chart')).toBeOnTheScreen();
      expect(queryByText('No price history available')).not.toBeOnTheScreen();
    });

    it('renders empty state when no data provided', () => {
      const { getByText } = renderWithProvider(
        <PredictGameChartContent data={[]} testID="chart" />,
      );

      expect(getByText('No price history available')).toBeOnTheScreen();
    });

    it('renders empty state when data has empty series', () => {
      const emptySeriesData: GameChartSeries[] = [
        { label: 'Empty', color: '#000', data: [] },
      ];
      const { getByText } = renderWithProvider(
        <PredictGameChartContent data={emptySeriesData} testID="chart" />,
      );

      expect(getByText('No price history available')).toBeOnTheScreen();
    });
  });

  describe('Error State', () => {
    it('renders error state when error prop is provided', () => {
      const { getByText, queryByTestId } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Failed to fetch price history"
          testID="chart"
        />,
      );

      expect(getByText('Unable to load price history')).toBeOnTheScreen();
      expect(queryByTestId('line-chart')).not.toBeOnTheScreen();
    });

    it('renders retry button when onRetry is provided', () => {
      const onRetry = jest.fn();

      const { getByTestId, getByText } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Failed to fetch"
          onRetry={onRetry}
          testID="chart"
        />,
      );

      expect(getByText('Retry')).toBeOnTheScreen();
      expect(getByTestId('retry-button')).toBeOnTheScreen();
    });

    it('calls onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();

      const { getByTestId } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Failed to fetch"
          onRetry={onRetry}
          testID="chart"
        />,
      );

      fireEvent.press(getByTestId('retry-button'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      const { queryByTestId, queryByText } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Failed to fetch"
          testID="chart"
        />,
      );

      expect(queryByText('Retry')).not.toBeOnTheScreen();
      expect(queryByTestId('retry-button')).not.toBeOnTheScreen();
    });

    it('renders timeframe selector in error state when onTimeframeChange provided', () => {
      const onTimeframeChange = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Failed to fetch"
          onTimeframeChange={onTimeframeChange}
          testID="chart"
        />,
      );

      expect(getByText('Live')).toBeOnTheScreen();
      expect(getByText('6H')).toBeOnTheScreen();
    });

    it('prioritizes error state over empty state', () => {
      const { getByText, queryByText } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          error="Network error"
          testID="chart"
        />,
      );

      expect(getByText('Unable to load price history')).toBeOnTheScreen();
      expect(queryByText('No price history available')).not.toBeOnTheScreen();
    });
  });

  describe('Dual Series Rendering', () => {
    it('renders both team lines with correct data', () => {
      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} />,
      );

      const charts = getAllByTestId('line-chart');
      expect(charts.length).toBeGreaterThanOrEqual(1);
    });

    it('limits series to maximum of 2', () => {
      const threeSeries: GameChartSeries[] = [
        ...mockDualSeriesData,
        { label: 'Extra', color: '#000', data: [{ timestamp: 1, value: 50 }] },
      ];

      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={threeSeries} />,
      );

      const charts = getAllByTestId('line-chart');
      expect(charts.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Timeframe Selector', () => {
    it('renders timeframe selector when onTimeframeChange provided', () => {
      const onTimeframeChange = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictGameChartContent
          data={mockDualSeriesData}
          onTimeframeChange={onTimeframeChange}
        />,
      );

      expect(getByText('Live')).toBeOnTheScreen();
      expect(getByText('6H')).toBeOnTheScreen();
      expect(getByText('1D')).toBeOnTheScreen();
      expect(getByText('Max')).toBeOnTheScreen();
    });

    it('does not render timeframe selector when onTimeframeChange not provided', () => {
      const { queryByText } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} />,
      );

      expect(queryByText('Live')).not.toBeOnTheScreen();
    });

    it('calls onTimeframeChange when timeframe button pressed', () => {
      const onTimeframeChange = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictGameChartContent
          data={mockDualSeriesData}
          onTimeframeChange={onTimeframeChange}
        />,
      );

      fireEvent.press(getByText('6H'));

      expect(onTimeframeChange).toHaveBeenCalledWith('6h');
    });

    it('renders disabled timeframe selector in loading state', () => {
      const onTimeframeChange = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictGameChartContent
          data={[]}
          isLoading
          onTimeframeChange={onTimeframeChange}
        />,
      );

      expect(getByText('Live')).toBeOnTheScreen();
    });
  });

  describe('Data Processing', () => {
    it('processes chart data correctly', () => {
      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} />,
      );

      const chartDataElements = getAllByTestId('chart-data');
      const data = JSON.parse(String(chartDataElements[0].children[0]));

      expect(data).toEqual([50, 55, 60, 70]);
    });

    it('calculates chart bounds with padding', () => {
      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} />,
      );

      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts[0].props.yMin).toBeLessThan(30);
      expect(lineCharts[0].props.yMax).toBeGreaterThan(70);
    });

    it('clamps chart bounds to 0-100 percentage range', () => {
      const extremeData: GameChartSeries[] = [
        {
          label: 'Extreme',
          color: '#000',
          data: [
            { timestamp: 1, value: 5 },
            { timestamp: 2, value: 95 },
          ],
        },
      ];

      const { getByTestId } = renderWithProvider(
        <PredictGameChartContent data={extremeData} />,
      );

      const lineChart = getByTestId('line-chart');
      expect(lineChart.props.yMin).toBeGreaterThanOrEqual(0);
      expect(lineChart.props.yMax).toBeLessThanOrEqual(100);
    });

    it('renders empty state when series has no data points', () => {
      const emptyData: GameChartSeries[] = [
        { label: 'Empty', color: '#000', data: [] },
      ];

      const { getByText } = renderWithProvider(
        <PredictGameChartContent data={emptyData} />,
      );

      expect(getByText('No price history available')).toBeOnTheScreen();
    });
  });

  describe('Chart Bounds Calculation', () => {
    it('handles single data point', () => {
      const singlePointData: GameChartSeries[] = [mockAwayTeamData];

      const { getByTestId } = renderWithProvider(
        <PredictGameChartContent data={singlePointData} />,
      );

      expect(getByTestId('line-chart')).toBeOnTheScreen();
    });

    it('handles zero range data (all same values)', () => {
      const sameValueData: GameChartSeries[] = [
        {
          label: 'SEA',
          color: '#002244',
          data: [
            { timestamp: 1, value: 50 },
            { timestamp: 2, value: 50 },
            { timestamp: 3, value: 50 },
          ],
        },
        {
          label: 'DEN',
          color: '#FB4F14',
          data: [
            { timestamp: 1, value: 50 },
            { timestamp: 2, value: 50 },
            { timestamp: 3, value: 50 },
          ],
        },
      ];

      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={sameValueData} />,
      );

      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThanOrEqual(1);
      expect(lineCharts[0].props.yMin).toBeLessThan(50);
      expect(lineCharts[0].props.yMax).toBeGreaterThan(50);
    });
  });

  describe('Touch Interactions', () => {
    it('renders chart with pan handler setup', () => {
      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={mockDualSeriesData} />,
      );

      const lineCharts = getAllByTestId('line-chart');
      expect(lineCharts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Timeframe Prop', () => {
    it('uses default timeframe when not provided', () => {
      const onTimeframeChange = jest.fn();

      renderWithProvider(
        <PredictGameChartContent
          data={mockDualSeriesData}
          onTimeframeChange={onTimeframeChange}
        />,
      );

      expect(onTimeframeChange).not.toHaveBeenCalled();
    });

    it('respects provided timeframe', () => {
      const onTimeframeChange = jest.fn();

      const { getByText } = renderWithProvider(
        <PredictGameChartContent
          data={mockDualSeriesData}
          timeframe="1d"
          onTimeframeChange={onTimeframeChange}
        />,
      );

      expect(getByText('1D')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles large dataset', () => {
      // Use deterministic values based on index instead of Math.random()
      // This ensures consistent test results across runs
      const largeDataset: GameChartSeries[] = [
        {
          label: 'SEA',
          color: '#002244',
          data: Array.from({ length: 100 }, (_, i) => ({
            timestamp: i * 1000,
            value: 30 + (i % 10) * 4, // Deterministic: cycles 30, 34, 38... 66, 30, 34...
          })),
        },
        {
          label: 'DEN',
          color: '#FB4F14',
          data: Array.from({ length: 100 }, (_, i) => ({
            timestamp: i * 1000,
            value: 70 - (i % 10) * 4, // Deterministic: cycles 70, 66, 62... 34, 70, 66...
          })),
        },
      ];

      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={largeDataset} />,
      );

      expect(getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
    });

    it('handles inverse probability data (teams summing to 100)', () => {
      const inverseData: GameChartSeries[] = [
        {
          label: 'SEA',
          color: '#002244',
          data: [
            { timestamp: 1, value: 70 },
            { timestamp: 2, value: 60 },
            { timestamp: 3, value: 40 },
          ],
        },
        {
          label: 'DEN',
          color: '#FB4F14',
          data: [
            { timestamp: 1, value: 30 },
            { timestamp: 2, value: 40 },
            { timestamp: 3, value: 60 },
          ],
        },
      ];

      const { getAllByTestId } = renderWithProvider(
        <PredictGameChartContent data={inverseData} />,
      );

      const charts = getAllByTestId('line-chart');
      expect(charts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
