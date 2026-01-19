import React from 'react';
import { render } from '@testing-library/react-native';
import ChartTooltip from './ChartTooltip';
import { GameChartSeries, GameChartDataPoint } from './PredictGameChart.types';

jest.mock('react-native-svg', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    G: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View testID="svg-g" {...props}>
        {children}
      </View>
    ),
    Circle: (props: Record<string, unknown>) => (
      <View
        testID="svg-circle"
        accessibilityLabel={`circle-cx-${props.cx}-cy-${props.cy}-r-${props.r}`}
        {...props}
      />
    ),
    Line: (props: Record<string, unknown>) => (
      <View
        testID="svg-line"
        accessibilityLabel={`line-x1-${props.x1}-y1-${props.y1}`}
        {...props}
      />
    ),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      x?: number;
      y?: number;
    }) => (
      <Text testID="svg-text" accessibilityLabel={`text-at-${props.x}`}>
        {children}
      </Text>
    ),
  };
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { alternative: '#888888', default: '#000000' },
      background: { default: '#FFFFFF' },
    },
  }),
}));

const mockXFunction = (index: number) => index * 10 + 50;
const mockYFunction = (value: number) => 200 - value * 2;

const mockPrimaryData: GameChartDataPoint[] = [
  { timestamp: 1704067200000, value: 50 },
  { timestamp: 1704070800000, value: 55 },
  { timestamp: 1704074400000, value: 60 },
];

const mockNonEmptySeries: GameChartSeries[] = [
  {
    label: 'Team A',
    color: '#FF0000',
    data: mockPrimaryData,
  },
  {
    label: 'Team B',
    color: '#0000FF',
    data: [
      { timestamp: 1704067200000, value: 50 },
      { timestamp: 1704070800000, value: 45 },
      { timestamp: 1704074400000, value: 40 },
    ],
  },
];

const defaultProps = {
  x: mockXFunction,
  y: mockYFunction,
  activeIndex: 1,
  primaryData: mockPrimaryData,
  nonEmptySeries: mockNonEmptySeries,
  chartWidth: 300,
  contentInset: { top: 20, bottom: 20, left: 10, right: 80 },
};

describe('ChartTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders tooltip with timestamp and crosshair', () => {
      const { getAllByTestId } = render(<ChartTooltip {...defaultProps} />);

      const textElements = getAllByTestId('svg-text');
      expect(textElements.length).toBeGreaterThan(0);

      const lineElements = getAllByTestId('svg-line');
      expect(lineElements.length).toBe(1);
    });

    it('renders dots for each series', () => {
      const { getAllByTestId } = render(<ChartTooltip {...defaultProps} />);

      const circleElements = getAllByTestId('svg-circle');
      expect(circleElements.length).toBe(4);
    });

    it('renders labels with team names and values', () => {
      const { getAllByTestId } = render(<ChartTooltip {...defaultProps} />);

      const textElements = getAllByTestId('svg-text');
      const textContents = textElements.map((el) => el.children[0]);

      expect(textContents).toContain('Team A');
      expect(textContents).toContain('Team B');
      expect(textContents).toContain('55%');
      expect(textContents).toContain('45%');
    });

    it('formats timestamp correctly', () => {
      const { getAllByTestId } = render(<ChartTooltip {...defaultProps} />);

      const textElements = getAllByTestId('svg-text');
      const timestampText = textElements[0].children[0];

      expect(typeof timestampText).toBe('string');
      expect(timestampText).toContain('at');
    });
  });

  describe('Edge Cases', () => {
    it('returns null when x function is undefined', () => {
      const { queryByTestId } = render(
        <ChartTooltip {...defaultProps} x={undefined} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('returns null when y function is undefined', () => {
      const { queryByTestId } = render(
        <ChartTooltip {...defaultProps} y={undefined} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('returns null when activeIndex is negative', () => {
      const { queryByTestId } = render(
        <ChartTooltip {...defaultProps} activeIndex={-1} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('returns null when activeIndex exceeds data length', () => {
      const { queryByTestId } = render(
        <ChartTooltip {...defaultProps} activeIndex={10} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('handles single series data', () => {
      const singleSeries = [mockNonEmptySeries[0]];
      const { getAllByTestId } = render(
        <ChartTooltip {...defaultProps} nonEmptySeries={singleSeries} />,
      );

      const circleElements = getAllByTestId('svg-circle');
      expect(circleElements.length).toBe(2);
    });

    it('handles empty series array', () => {
      const { queryAllByTestId } = render(
        <ChartTooltip {...defaultProps} nonEmptySeries={[]} />,
      );

      const circleElements = queryAllByTestId('svg-circle');
      expect(circleElements.length).toBe(0);
    });
  });

  describe('Label Positioning', () => {
    it('adjusts labels when dots are close together', () => {
      const closeValuesSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 50 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 51 }],
        },
      ];

      const { getAllByTestId } = render(
        <ChartTooltip
          {...defaultProps}
          activeIndex={0}
          primaryData={closeValuesSeries[0].data}
          nonEmptySeries={closeValuesSeries}
        />,
      );

      const textElements = getAllByTestId('svg-text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('keeps labels at dot position when far apart', () => {
      const farApartSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 20 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 80 }],
        },
      ];

      const { getAllByTestId } = render(
        <ChartTooltip
          {...defaultProps}
          activeIndex={0}
          primaryData={farApartSeries[0].data}
          nonEmptySeries={farApartSeries}
        />,
      );

      const textElements = getAllByTestId('svg-text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('handles first dot above second dot', () => {
      const firstAboveSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 70 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 71 }],
        },
      ];

      const { getAllByTestId } = render(
        <ChartTooltip
          {...defaultProps}
          activeIndex={0}
          primaryData={firstAboveSeries[0].data}
          nonEmptySeries={firstAboveSeries}
        />,
      );

      expect(getAllByTestId('svg-circle').length).toBe(4);
    });

    it('handles first dot below second dot', () => {
      const firstBelowSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 31 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 30 }],
        },
      ];

      const { getAllByTestId } = render(
        <ChartTooltip
          {...defaultProps}
          activeIndex={0}
          primaryData={firstBelowSeries[0].data}
          nonEmptySeries={firstBelowSeries}
        />,
      );

      expect(getAllByTestId('svg-circle').length).toBe(4);
    });
  });

  describe('Missing Data', () => {
    it('handles series with missing data at activeIndex', () => {
      const partialSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: mockPrimaryData,
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 50 }],
        },
      ];

      const { getAllByTestId } = render(
        <ChartTooltip
          {...defaultProps}
          activeIndex={2}
          nonEmptySeries={partialSeries}
        />,
      );

      const circleElements = getAllByTestId('svg-circle');
      expect(circleElements.length).toBe(2);
    });
  });
});
