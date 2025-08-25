import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import CandlestickChartAuxiliaryLines, {
  TPSLLines,
} from './CandlestickChartAuxiliaryLines';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
      ...props
    }: React.PropsWithChildren<{ testID?: string }>) => (
      <View testID={testID || 'svg'} {...props}>
        {children}
      </View>
    ),
    Line: ({ testID, ...props }: { testID?: string }) => (
      <View testID={testID || 'svg-line'} {...props} />
    ),
  };
});

// Mock component library hooks
jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      line: {},
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
  chartWidth: 400,
  visible: true,
  testID: 'test-auxiliary-lines',
};

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('CandlestickChartAuxiliaryLines', () => {
  describe('Rendering', () => {
    it('renders nothing when visible is false', () => {
      // Arrange & Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines {...defaultProps} visible={false} />,
      );

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });

    it('renders nothing when tpslLines is not provided', () => {
      // Arrange & Act
      renderWithTheme(<CandlestickChartAuxiliaryLines {...defaultProps} />);

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });

    it('renders nothing when transformedData is empty', () => {
      // Arrange & Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          transformedData={[]}
          tpslLines={{ takeProfitPrice: '45000' }}
        />,
      );

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });

    it('renders container when visible and has valid data', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '45500', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('test-auxiliary-lines')).toBeOnTheScreen();
    });
  });

  describe('Take Profit Lines', () => {
    it('renders take profit line when takeProfitPrice is within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '45500', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-tp-0')).toBeOnTheScreen();
    });

    it('does not render take profit line when price is outside chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '50000', // Outside range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });
  });

  describe('Stop Loss Lines', () => {
    it('renders stop loss line when stopLossPrice is within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        stopLossPrice: '44000', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-sl-0')).toBeOnTheScreen();
    });

    it('does not render stop loss line when price is outside chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        stopLossPrice: '40000', // Outside range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });
  });

  describe('Entry Price Lines', () => {
    it('renders entry price line when entryPrice is within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        entryPrice: '46000', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-entry-0')).toBeOnTheScreen();
    });
  });

  describe('Liquidation Price Lines', () => {
    it('renders liquidation price line when liquidationPrice is within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        liquidationPrice: '43800', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(
        screen.getByTestId('auxiliary-line-liquidation-0'),
      ).toBeOnTheScreen();
    });

    it('handles null liquidationPrice gracefully', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        liquidationPrice: null,
        takeProfitPrice: '45000',
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-tp-0')).toBeOnTheScreen();
      expect(screen.queryByTestId('auxiliary-line-liquidation-0')).toBeNull();
    });
  });

  describe('Current Price Lines', () => {
    it('renders current price line when currentPrice is within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        currentPrice: '45000', // Within range (43500-47000)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-current-0')).toBeOnTheScreen();
    });
  });

  describe('Multiple Lines', () => {
    it('renders multiple lines when multiple prices are provided', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '46500', // Within range
        stopLossPrice: '44000', // Within range
        entryPrice: '45000', // Within range
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-tp-0')).toBeOnTheScreen();
      expect(screen.getByTestId('auxiliary-line-sl-1')).toBeOnTheScreen();
      expect(screen.getByTestId('auxiliary-line-entry-2')).toBeOnTheScreen();
    });

    it('only renders lines with prices within chart range', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '46500', // Within range
        stopLossPrice: '40000', // Outside range (too low)
        entryPrice: '50000', // Outside range (too high)
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('auxiliary-line-tp-0')).toBeOnTheScreen();
      expect(screen.queryByTestId('auxiliary-line-sl-0')).toBeNull();
      expect(screen.queryByTestId('auxiliary-line-entry-0')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid price strings gracefully', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: 'invalid-price',
        stopLossPrice: '45000', // Valid price
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.queryByTestId('auxiliary-line-tp-0')).toBeNull();
      expect(screen.getByTestId('auxiliary-line-sl-0')).toBeOnTheScreen();
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
      const tpslLines: TPSLLines = {
        takeProfitPrice: '45000',
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          transformedData={flatData}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.queryByTestId('test-auxiliary-lines')).toBeNull();
    });
  });

  describe('SVG Rendering', () => {
    it('renders SVG components for dashed lines', () => {
      // Arrange
      const tpslLines: TPSLLines = {
        takeProfitPrice: '45000',
      };

      // Act
      renderWithTheme(
        <CandlestickChartAuxiliaryLines
          {...defaultProps}
          tpslLines={tpslLines}
        />,
      );

      // Assert
      expect(screen.getByTestId('svg')).toBeOnTheScreen();
      expect(screen.getByTestId('svg-line')).toBeOnTheScreen();
    });
  });
});
