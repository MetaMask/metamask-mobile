import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CandlestickChartXAxis from './CandlestickChartXAxis';
import { ChartDataPoint } from '../utils/chartUtils';

// Mock component library hooks
jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      timeAxisContainer: {},
      timeLabel: {},
    },
  }),
}));

const mockTransformedData: ChartDataPoint[] = [
  {
    timestamp: 1640995200000, // 2022-01-01 00:00:00 UTC
    open: 44000,
    high: 45000,
    low: 43500,
    close: 44500,
  },
  {
    timestamp: 1641002400000, // 2022-01-01 02:00:00 UTC
    open: 44500,
    high: 46000,
    low: 44000,
    close: 45500,
  },
  {
    timestamp: 1641009600000, // 2022-01-01 04:00:00 UTC
    open: 45500,
    high: 47000,
    low: 45000,
    close: 46000,
  },
  {
    timestamp: 1641016800000, // 2022-01-01 06:00:00 UTC
    open: 46000,
    high: 46500,
    low: 45500,
    close: 46200,
  },
];

const defaultProps = {
  transformedData: mockTransformedData,
  chartWidth: 350,
  testID: 'test-x-axis',
};

describe('CandlestickChartXAxis', () => {
  describe('Rendering', () => {
    it('renders nothing when transformedData is empty', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} transformedData={[]} />);

      // Assert
      expect(screen.queryByTestId('test-x-axis')).toBeNull();
    });

    it('renders X-axis container when transformedData has data', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('test-x-axis')).toBeOnTheScreen();
    });

    it('renders default number of time labels (5)', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} />);

      // Assert
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });

    it('renders custom number of time labels', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} labelCount={3} />);

      // Assert
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(3);
    });

    it('renders time labels with proper testIDs', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} labelCount={3} />);

      // Assert
      expect(screen.getByTestId('time-label-0')).toBeOnTheScreen();
      expect(screen.getByTestId('time-label-1')).toBeOnTheScreen();
      expect(screen.getByTestId('time-label-2')).toBeOnTheScreen();
    });
  });

  describe('Time Formatting', () => {
    it('formats time labels with time and date', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} />);

      // Assert
      // Should find formatted time labels (time format may vary by timezone)
      const timeLabels = screen.getAllByTestId(/time-label-\d+$/);
      expect(timeLabels.length).toBeGreaterThan(0);

      // Check that at least one label contains time format (HH:MM)
      const hasTimeFormat = timeLabels.some((label) =>
        /\d{2}:\d{2}/.test(label.props.children),
      );
      expect(hasTimeFormat).toBe(true);
    });

    it('includes month and day in labels', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} />);

      // Assert
      const timeLabels = screen.getAllByTestId(/time-label-\d+$/);

      // Check that at least one label contains month format (Jan, Feb, etc.)
      const hasMonthFormat = timeLabels.some((label) =>
        /\n(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}/.test(
          label.props.children,
        ),
      );
      expect(hasMonthFormat).toBe(true);
    });
  });

  describe('Label Count Variations', () => {
    it('handles single label', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} labelCount={1} />);

      // Assert
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(1);
      expect(screen.getByTestId('time-label-0')).toBeOnTheScreen();
    });

    it('handles many labels', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} labelCount={10} />);

      // Assert
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(10);
    });

    it('uses default label count when not specified', () => {
      // Arrange & Act
      const { testID, ...propsWithoutLabelCount } = defaultProps;
      render(<CandlestickChartXAxis {...propsWithoutLabelCount} />);

      // Assert
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });
  });

  describe('Chart Width Variations', () => {
    it('handles narrow chart width', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} chartWidth={200} />);

      // Assert
      expect(screen.getByTestId('test-x-axis')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });

    it('handles wide chart width', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} chartWidth={800} />);

      // Assert
      expect(screen.getByTestId('test-x-axis')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });
  });

  describe('Data Variations', () => {
    it('handles single data point', () => {
      // Arrange
      const singleDataPoint = [mockTransformedData[0]];

      // Act
      render(
        <CandlestickChartXAxis
          {...defaultProps}
          transformedData={singleDataPoint}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-x-axis')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });

    it('handles large dataset', () => {
      // Arrange
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        timestamp: 1640995200000 + i * 3600000, // Hourly data
        open: 44000 + i * 10,
        high: 45000 + i * 10,
        low: 43500 + i * 10,
        close: 44500 + i * 10,
      }));

      // Act
      render(
        <CandlestickChartXAxis
          {...defaultProps}
          transformedData={largeDataset}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-x-axis')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/time-label-\d+$/)).toHaveLength(5);
    });
  });

  describe('TestID Structure', () => {
    it('uses custom testID when provided', () => {
      // Arrange & Act
      render(
        <CandlestickChartXAxis {...defaultProps} testID="custom-x-axis" />,
      );

      // Assert
      expect(screen.getByTestId('custom-x-axis')).toBeOnTheScreen();
    });

    it('uses default testID when not provided', () => {
      // Arrange & Act
      const { testID, ...propsWithoutTestID } = defaultProps;
      render(<CandlestickChartXAxis {...propsWithoutTestID} />);

      // Assert
      expect(screen.getByTestId('chart-x-axis')).toBeOnTheScreen();
    });

    it('generates sequential testIDs for time labels', () => {
      // Arrange & Act
      render(<CandlestickChartXAxis {...defaultProps} labelCount={3} />);

      // Assert
      expect(screen.getByTestId('time-label-0')).toBeOnTheScreen();
      expect(screen.getByTestId('time-label-1')).toBeOnTheScreen();
      expect(screen.getByTestId('time-label-2')).toBeOnTheScreen();
    });
  });
});
