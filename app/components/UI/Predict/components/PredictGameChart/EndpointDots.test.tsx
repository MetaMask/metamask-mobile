import React from 'react';
import { render } from '@testing-library/react-native';
import EndpointDots from './EndpointDots';
import { GameChartSeries } from './PredictGameChart.types';

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
      text: { default: '#000000' },
    },
  }),
}));

const mockXFunction = (index: number) => index * 10 + 50;
const mockYFunction = (value: number) => 200 - value * 2;

const mockNonEmptySeries: GameChartSeries[] = [
  {
    label: 'Team A',
    color: '#FF0000',
    data: [
      { timestamp: 1704067200000, value: 50 },
      { timestamp: 1704070800000, value: 55 },
      { timestamp: 1704074400000, value: 60 },
    ],
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
  nonEmptySeries: mockNonEmptySeries,
  primaryDataLength: 3,
};

describe('EndpointDots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders endpoint dots for each series', () => {
      const { getAllByTestId } = render(<EndpointDots {...defaultProps} />);

      const circleElements = getAllByTestId('svg-circle');
      expect(circleElements.length).toBe(4);
    });

    it('renders labels with team names', () => {
      const { getAllByTestId } = render(<EndpointDots {...defaultProps} />);

      const textElements = getAllByTestId('svg-text');
      const textContents = textElements.map((el) => el.children[0]);

      expect(textContents).toContain('TEAM A');
      expect(textContents).toContain('TEAM B');
    });

    it('renders values with percentage format', () => {
      const { getAllByTestId } = render(<EndpointDots {...defaultProps} />);

      const textElements = getAllByTestId('svg-text');
      const textContents = textElements.map((el) => el.children[0]);

      expect(textContents).toContain('60%');
      expect(textContents).toContain('40%');
    });

    it('renders glow circle for each dot', () => {
      const { getAllByTestId } = render(<EndpointDots {...defaultProps} />);

      const circles = getAllByTestId('svg-circle');
      expect(circles.length).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('returns null when x function is undefined', () => {
      const { queryByTestId } = render(
        <EndpointDots {...defaultProps} x={undefined} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('returns null when y function is undefined', () => {
      const { queryByTestId } = render(
        <EndpointDots {...defaultProps} y={undefined} />,
      );

      expect(queryByTestId('svg-g')).toBeNull();
    });

    it('handles single series', () => {
      const singleSeries = [mockNonEmptySeries[0]];
      const { getAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={singleSeries} />,
      );

      const circleElements = getAllByTestId('svg-circle');
      expect(circleElements.length).toBe(2);
    });

    it('handles empty series array', () => {
      const { queryAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={[]} />,
      );

      const circleElements = queryAllByTestId('svg-circle');
      expect(circleElements.length).toBe(0);
    });

    it('handles series with empty data array', () => {
      const emptyDataSeries: GameChartSeries[] = [
        { label: 'Empty', color: '#000', data: [] },
      ];

      const { queryAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={emptyDataSeries} />,
      );

      const circleElements = queryAllByTestId('svg-circle');
      expect(circleElements.length).toBe(0);
    });

    it('returns no dots when primaryDataLength is 0', () => {
      const { queryAllByTestId } = render(
        <EndpointDots {...defaultProps} primaryDataLength={0} />,
      );

      const circleElements = queryAllByTestId('svg-circle');
      expect(circleElements.length).toBe(0);
    });

    it('positions all endpoint dots at the same x-coordinate based on primaryDataLength', () => {
      // This tests the fix for the bug where endpoint dots would appear at incorrect positions
      // when series have different data lengths (e.g., during live WebSocket updates)
      const differentLengthSeries: GameChartSeries[] = [
        {
          label: 'Primary',
          color: '#FF0000',
          data: [
            { timestamp: 1704067200000, value: 50 },
            { timestamp: 1704070800000, value: 55 },
            { timestamp: 1704074400000, value: 60 },
            { timestamp: 1704078000000, value: 65 },
            { timestamp: 1704081600000, value: 70 },
          ],
        },
        {
          label: 'Overlay',
          color: '#0000FF',
          data: [
            { timestamp: 1704067200000, value: 50 },
            { timestamp: 1704070800000, value: 45 },
            { timestamp: 1704074400000, value: 40 },
          ],
        },
      ];

      const { getAllByTestId } = render(
        <EndpointDots
          {...defaultProps}
          nonEmptySeries={differentLengthSeries}
          primaryDataLength={5}
        />,
      );

      const circles = getAllByTestId('svg-circle');
      // Each series has 2 circles (glow + dot), so 4 total
      expect(circles.length).toBe(4);

      // Both dots should be at x-coordinate for index 4 (primaryDataLength - 1 = 5 - 1 = 4)
      // mockXFunction(4) = 4 * 10 + 50 = 90
      const expectedX = mockXFunction(4);
      const circleLabels = circles.map((c) => c.props.accessibilityLabel);

      // Check that all circles are at the same x position (90)
      circleLabels.forEach((label) => {
        expect(label).toContain(`cx-${expectedX}`);
      });
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
        <EndpointDots {...defaultProps} nonEmptySeries={closeValuesSeries} />,
      );

      const textElements = getAllByTestId('svg-text');
      expect(textElements.length).toBe(4);
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
        <EndpointDots {...defaultProps} nonEmptySeries={farApartSeries} />,
      );

      const textElements = getAllByTestId('svg-text');
      expect(textElements.length).toBe(4);
    });

    it('handles first dot above second dot when close', () => {
      const firstAboveSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 71 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 70 }],
        },
      ];

      const { getAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={firstAboveSeries} />,
      );

      expect(getAllByTestId('svg-circle').length).toBe(4);
    });

    it('handles first dot below second dot when close', () => {
      const firstBelowSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 30 }],
        },
        {
          label: 'Team B',
          color: '#0000FF',
          data: [{ timestamp: 1704067200000, value: 31 }],
        },
      ];

      const { getAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={firstBelowSeries} />,
      );

      expect(getAllByTestId('svg-circle').length).toBe(4);
    });
  });

  describe('Value Formatting', () => {
    it('rounds values to whole numbers', () => {
      const decimalSeries: GameChartSeries[] = [
        {
          label: 'Team A',
          color: '#FF0000',
          data: [{ timestamp: 1704067200000, value: 55.7 }],
        },
      ];

      const { getAllByTestId } = render(
        <EndpointDots {...defaultProps} nonEmptySeries={decimalSeries} />,
      );

      const textElements = getAllByTestId('svg-text');
      const valueText = textElements.find((el) => el.children[0] === '56%');
      expect(valueText).toBeTruthy();
    });
  });
});
