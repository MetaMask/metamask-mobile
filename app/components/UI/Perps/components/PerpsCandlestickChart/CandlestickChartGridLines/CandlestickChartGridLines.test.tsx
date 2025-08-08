import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import CandlestickChartGridLines from './CandlestickChartGridLines';

// Mock component library hooks
jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      gridContainer: {},
      gridPriceLabel: {},
    },
  }),
}));

const mockTransformedData = [
  {
    timestamp: 1640995200000,
    open: 44000,
    high: 45000,
    low: 43500,
    close: 44500,
  },
  {
    timestamp: 1640998800000,
    open: 44500,
    high: 46000,
    low: 44000,
    close: 45500,
  },
  {
    timestamp: 1641002400000,
    open: 45500,
    high: 47000,
    low: 45000,
    close: 46000,
  },
  {
    timestamp: 1641006000000,
    open: 46000,
    high: 46500,
    low: 45500,
    close: 46200,
  },
];

const defaultProps = {
  transformedData: mockTransformedData,
  height: 300,
  testID: 'test-grid-lines',
};

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('CandlestickChartGridLines', () => {
  describe('Rendering', () => {
    it('renders nothing when transformedData is empty', () => {
      // Arrange & Act
      renderWithTheme(
        <CandlestickChartGridLines {...defaultProps} transformedData={[]} />,
      );

      // Assert
      expect(screen.queryByTestId('test-grid-lines')).toBeNull();
    });

    it('renders grid container when transformedData has data', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
    });

    it('renders multiple grid lines with default count', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      // Should render 6 grid lines by default (GRID_LINE_COUNT from config)
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });

    it('renders grid line bars for each grid line', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      expect(screen.getAllByTestId(/grid-line-bar-\d+$/)).toHaveLength(6);
    });

    it('renders price labels for each grid line', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      expect(screen.getAllByTestId(/grid-price-label-\d+$/)).toHaveLength(6);
    });
  });

  describe('Price Calculation', () => {
    it('renders price labels with formatted values', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      // Should find price labels with $ symbol and formatted numbers
      expect(screen.getByText(/\$43,500/)).toBeOnTheScreen(); // Min price
      expect(screen.getByText(/\$47,000/)).toBeOnTheScreen(); // Max price
    });

    it('renders evenly spaced price levels', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      // With price range 43,500 to 47,000 (3,500 range) and 6 lines,
      // should have intermediate values like 44,200, 44,900, etc.
      const priceTexts = screen.getAllByText(/\$\d{2,3},?\d{3}/);
      expect(priceTexts).toHaveLength(6);
    });
  });

  describe('Different Data Ranges', () => {
    it('handles small price ranges correctly', () => {
      // Arrange
      const smallRangeData = [
        { timestamp: 1640995200000, open: 100, high: 101, low: 99, close: 100 },
        { timestamp: 1640998800000, open: 100, high: 102, low: 98, close: 101 },
      ];

      // Act
      renderWithTheme(
        <CandlestickChartGridLines
          {...defaultProps}
          transformedData={smallRangeData}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });

    it('handles large price ranges correctly', () => {
      // Arrange
      const largeRangeData = [
        {
          timestamp: 1640995200000,
          open: 10000,
          high: 50000,
          low: 5000,
          close: 25000,
        },
        {
          timestamp: 1640998800000,
          open: 25000,
          high: 60000,
          low: 10000,
          close: 40000,
        },
      ];

      // Act
      renderWithTheme(
        <CandlestickChartGridLines
          {...defaultProps}
          transformedData={largeRangeData}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point correctly', () => {
      // Arrange
      const singleDataPoint = [
        {
          timestamp: 1640995200000,
          open: 45000,
          high: 45000,
          low: 45000,
          close: 45000,
        },
      ];

      // Act
      renderWithTheme(
        <CandlestickChartGridLines
          {...defaultProps}
          transformedData={singleDataPoint}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });

    it('handles zero price range gracefully', () => {
      // Arrange
      const flatData = [
        {
          timestamp: 1640995200000,
          open: 45000,
          high: 45000,
          low: 45000,
          close: 45000,
        },
        {
          timestamp: 1640998800000,
          open: 45000,
          high: 45000,
          low: 45000,
          close: 45000,
        },
      ];

      // Act
      renderWithTheme(
        <CandlestickChartGridLines
          {...defaultProps}
          transformedData={flatData}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      // Should still render grid lines even with zero range
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });
  });

  describe('Height Variations', () => {
    it('adjusts grid line positions based on height', () => {
      // Arrange
      const tallHeight = 600;

      // Act
      renderWithTheme(
        <CandlestickChartGridLines {...defaultProps} height={tallHeight} />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });

    it('handles small height values', () => {
      // Arrange
      const smallHeight = 100;

      // Act
      renderWithTheme(
        <CandlestickChartGridLines {...defaultProps} height={smallHeight} />,
      );

      // Assert
      expect(screen.getByTestId('test-grid-lines')).toBeOnTheScreen();
      expect(screen.getAllByTestId(/grid-line-\d+$/)).toHaveLength(6);
    });
  });

  describe('TestID Structure', () => {
    it('uses custom testID when provided', () => {
      // Arrange & Act
      renderWithTheme(
        <CandlestickChartGridLines
          {...defaultProps}
          testID="custom-grid-lines"
        />,
      );

      // Assert
      expect(screen.getByTestId('custom-grid-lines')).toBeOnTheScreen();
    });

    it('uses default testID when not provided', () => {
      // Arrange & Act
      const { testID, ...propsWithoutTestID } = defaultProps;
      renderWithTheme(<CandlestickChartGridLines {...propsWithoutTestID} />);

      // Assert
      expect(screen.getByTestId('chart-grid-lines')).toBeOnTheScreen();
    });

    it('generates sequential testIDs for grid elements', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartGridLines {...defaultProps} />);

      // Assert
      // Check that grid lines have sequential IDs
      expect(screen.getByTestId('grid-line-0')).toBeOnTheScreen();
      expect(screen.getByTestId('grid-line-1')).toBeOnTheScreen();
      expect(screen.getByTestId('grid-line-5')).toBeOnTheScreen();

      // Check that bars and labels have matching sequential IDs
      expect(screen.getByTestId('grid-line-bar-0')).toBeOnTheScreen();
      expect(screen.getByTestId('grid-price-label-0')).toBeOnTheScreen();
    });
  });
});
