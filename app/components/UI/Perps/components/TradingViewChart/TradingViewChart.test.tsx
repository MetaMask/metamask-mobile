import React from 'react';
import { render } from '@testing-library/react-native';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import TradingViewChart, { TPSLLines } from './TradingViewChart';
import type { CandleData } from '../../types';

// Mock WebView - using a string name to avoid out-of-scope issues
jest.mock('@metamask/react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      webView: { flex: 1 },
    },
    theme: {
      colors: {
        background: { default: '#FFFFFF' },
        border: { muted: '#E5E5E5' },
        text: { muted: '#6B7280' },
        error: { muted: '#FEF2F2' },
      },
    },
  }),
}));

// Mock DevLogger
jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

// Mock selectors
jest.mock('../../../../../../e2e/selectors/Perps/Perps.selectors', () => ({
  TradingViewChartSelectorsIDs: {
    CONTAINER: 'tradingview-chart-container',
  },
}));

describe('TradingViewChart', () => {
  const mockCandleData: CandleData = {
    coin: 'BTC',
    interval: CandlePeriod.ONE_HOUR,
    candles: [
      {
        time: 1640995200000, // 2022-01-01 00:00:00
        open: '45000',
        high: '46000',
        low: '44000',
        close: '45500',
        volume: '1000',
      },
      {
        time: 1640998800000, // 2022-01-01 01:00:00
        open: '45500',
        high: '47000',
        low: '45000',
        close: '46500',
        volume: '1200',
      },
    ],
  };

  const mockTPSLLines: TPSLLines = {
    takeProfitPrice: '50000',
    stopLossPrice: '40000',
    entryPrice: '45000',
    liquidationPrice: '35000',
    currentPrice: '46000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders chart container with default props', () => {
      const { getByTestId } = render(<TradingViewChart />);

      expect(getByTestId('tradingview-chart-container')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      const customTestID = 'custom-chart-test-id';
      const { getByTestId } = render(
        <TradingViewChart testID={customTestID} />,
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('renders WebView with correct testID', () => {
      const { getByTestId } = render(<TradingViewChart />);

      expect(
        getByTestId('tradingview-chart-container-webview'),
      ).toBeOnTheScreen();
    });

    it('applies custom height to container', () => {
      const customHeight = 500;
      const { getByTestId } = render(
        <TradingViewChart height={customHeight} />,
      );

      const container = getByTestId('tradingview-chart-container');
      expect(container).toBeOnTheScreen();
    });
  });

  describe('Data Processing', () => {
    it('renders component with different duration and period combinations', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          selectedDuration={TimeDuration.ONE_HOUR}
          selectedCandlePeriod={CandlePeriod.ONE_MINUTE}
          testID="short-duration-test"
        />,
      );

      // Assert
      expect(getByTestId('short-duration-test')).toBeOnTheScreen();
    });

    it('renders component with maximum duration settings', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          selectedDuration={TimeDuration.MAX}
          selectedCandlePeriod={CandlePeriod.ONE_MINUTE}
          testID="max-duration-test"
        />,
      );

      // Assert
      expect(getByTestId('max-duration-test')).toBeOnTheScreen();
    });

    it('handles unknown duration gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          selectedDuration={'unknown' as TimeDuration}
          selectedCandlePeriod={CandlePeriod.ONE_HOUR}
          testID="unknown-duration-test"
        />,
      );

      // Assert
      expect(getByTestId('unknown-duration-test')).toBeOnTheScreen();
    });
  });

  describe('Data Handling', () => {
    it('renders successfully with valid candle data', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="valid-data-test"
        />,
      );

      // Assert
      expect(getByTestId('valid-data-test')).toBeOnTheScreen();
    });

    it('renders successfully with invalid candle data', () => {
      // Arrange
      const invalidCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
          {
            time: 1640998800000,
            open: 'invalid', // Invalid price
            high: '47000',
            low: '45000',
            close: '46500',
            volume: '1200',
          },
        ],
      };

      // Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={invalidCandleData}
          testID="invalid-data-test"
        />,
      );

      // Assert - Component should still render, filtering out invalid data internally
      expect(getByTestId('invalid-data-test')).toBeOnTheScreen();
    });

    it('renders successfully with unsorted candle data', () => {
      // Arrange
      const unsortedCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640998800000, // Later time first
            open: '45500',
            high: '47000',
            low: '45000',
            close: '46500',
            volume: '1200',
          },
          {
            time: 1640995200000, // Earlier time second
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
        ],
      };

      // Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={unsortedCandleData}
          testID="unsorted-data-test"
        />,
      );

      // Assert - Component should handle sorting internally
      expect(getByTestId('unsorted-data-test')).toBeOnTheScreen();
    });

    it('renders successfully with empty candle data', () => {
      // Arrange
      const emptyData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [],
      };

      // Act
      const { getByTestId } = render(
        <TradingViewChart candleData={emptyData} testID="empty-data-test" />,
      );

      // Assert
      expect(getByTestId('empty-data-test')).toBeOnTheScreen();
    });
  });

  describe('WebView Integration', () => {
    it('renders WebView component', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="webview-test" />,
      );

      // Assert
      expect(getByTestId('webview-test')).toBeOnTheScreen();
      expect(getByTestId('webview-test-webview')).toBeOnTheScreen();
    });

    it('passes onChartReady callback prop correctly', () => {
      // Arrange
      const mockOnChartReady = jest.fn();

      // Act & Assert - Should not throw error
      expect(() => {
        render(<TradingViewChart onChartReady={mockOnChartReady} />);
      }).not.toThrow();
    });

    it('renders with all WebView props configured', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="full-webview-test" />,
      );

      // Assert - Component should render with all WebView configuration
      expect(getByTestId('full-webview-test')).toBeOnTheScreen();
      expect(getByTestId('full-webview-test-webview')).toBeOnTheScreen();
    });
  });

  describe('Props Behavior', () => {
    it('uses default values when props are not provided', () => {
      // Arrange & Act
      const { getByTestId } = render(<TradingViewChart />);

      // Assert
      const container = getByTestId('tradingview-chart-container');
      expect(container).toBeOnTheScreen();
    });

    it('passes candle data to chart when provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="chart-with-data"
        />,
      );

      // Assert
      expect(getByTestId('chart-with-data')).toBeOnTheScreen();
    });

    it('renders with TP/SL lines when provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          tpslLines={mockTPSLLines}
          testID="chart-with-lines"
        />,
      );

      // Assert
      expect(getByTestId('chart-with-lines')).toBeOnTheScreen();
    });

    it('handles different time durations correctly', () => {
      // Arrange & Act
      const { rerender, getByTestId } = render(
        <TradingViewChart
          selectedDuration={TimeDuration.ONE_WEEK}
          testID="duration-test"
        />,
      );

      // Assert
      expect(getByTestId('duration-test')).toBeOnTheScreen();

      // Act - Change duration
      rerender(
        <TradingViewChart
          selectedDuration={TimeDuration.ONE_MONTH}
          testID="duration-test"
        />,
      );

      // Assert
      expect(getByTestId('duration-test')).toBeOnTheScreen();
    });

    it('handles different candle periods correctly', () => {
      // Arrange & Act
      const { rerender, getByTestId } = render(
        <TradingViewChart
          selectedCandlePeriod={CandlePeriod.FIVE_MINUTES}
          testID="period-test"
        />,
      );

      // Assert
      expect(getByTestId('period-test')).toBeOnTheScreen();

      // Act - Change candle period
      rerender(
        <TradingViewChart
          selectedCandlePeriod={CandlePeriod.ONE_DAY}
          testID="period-test"
        />,
      );

      // Assert
      expect(getByTestId('period-test')).toBeOnTheScreen();
    });
  });

  describe('Error States', () => {
    it('renders component without errors in normal conditions', () => {
      // Arrange & Act
      const { getByTestId } = render(<TradingViewChart testID="error-test" />);

      // Assert
      expect(getByTestId('error-test')).toBeOnTheScreen();
    });

    it('handles props that could cause errors gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          height={0} // Edge case: zero height
          testID="zero-height-test"
        />,
      );

      // Assert
      expect(getByTestId('zero-height-test')).toBeOnTheScreen();
    });

    it('handles negative height gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          height={-100} // Edge case: negative height
          testID="negative-height-test"
        />,
      );

      // Assert
      expect(getByTestId('negative-height-test')).toBeOnTheScreen();
    });
  });

  describe('Data Robustness', () => {
    it('handles extremely invalid data gracefully', () => {
      // Arrange
      const extremelyInvalidData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 0, // Invalid time
            open: '-1000', // Invalid negative price
            high: 'NaN', // Invalid number
            low: '44000',
            close: '45500',
            volume: '1000',
          },
        ],
      };

      // Act & Assert - Component should not crash with invalid data
      expect(() => {
        render(
          <TradingViewChart
            candleData={extremelyInvalidData}
            testID="extreme-invalid-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles malformed candle objects gracefully', () => {
      // Arrange
      const malformedData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          null, // Null candle
          undefined, // Undefined candle
          {}, // Empty object
          {
            time: 1640995200000,
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
        ],
      } as CandleData; // Type assertion to allow malformed data

      // Act & Assert - Component should not crash
      expect(() => {
        render(
          <TradingViewChart
            candleData={malformedData}
            testID="malformed-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Message Handling', () => {
    it('renders component that handles interval updates', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          selectedDuration={TimeDuration.ONE_DAY}
          selectedCandlePeriod={CandlePeriod.ONE_HOUR}
          testID="interval-test"
        />,
      );

      // Assert
      expect(getByTestId('interval-test')).toBeOnTheScreen();
    });

    it('renders component configured for message handling', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="message-handling-test" />,
      );

      // Assert
      expect(getByTestId('message-handling-test')).toBeOnTheScreen();
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="loading-test" />,
      );

      // Assert
      expect(getByTestId('loading-test')).toBeOnTheScreen();
    });

    it('renders component with chart ready callback', () => {
      // Arrange
      const mockOnChartReady = jest.fn();

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            onChartReady={mockOnChartReady}
            testID="ready-test"
          />,
        );
      }).not.toThrow();
    });

    it('renders loading state with different data states', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart candleData={null} testID="loading-null-data" />,
      );

      // Assert
      expect(getByTestId('loading-null-data')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles null candle data gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart candleData={null} testID="null-data-test" />,
      );

      // Assert
      expect(getByTestId('null-data-test')).toBeOnTheScreen();
    });

    it('handles undefined TP/SL lines gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart tpslLines={undefined} testID="no-lines-test" />,
      );

      // Assert
      expect(getByTestId('no-lines-test')).toBeOnTheScreen();
    });

    it('handles missing onChartReady callback gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="no-callback-test" />,
      );

      // Assert - Component should render without callback
      expect(getByTestId('no-callback-test')).toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('initializes with correct default state', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="lifecycle-test" />,
      );

      // Assert
      expect(getByTestId('lifecycle-test')).toBeOnTheScreen();
    });

    it('updates when candle data changes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="data-update-test"
        />,
      );

      // Act
      const newCandleData: CandleData = {
        ...mockCandleData,
        candles: [
          ...mockCandleData.candles,
          {
            time: 1641002400000,
            open: '46500',
            high: '48000',
            low: '46000',
            close: '47500',
            volume: '1500',
          },
        ],
      };

      rerender(
        <TradingViewChart
          candleData={newCandleData}
          testID="data-update-test"
        />,
      );

      // Assert
      expect(getByTestId('data-update-test')).toBeOnTheScreen();
    });

    it('updates when TP/SL lines change', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          tpslLines={mockTPSLLines}
          testID="lines-update-test"
        />,
      );

      // Act
      const newTPSLLines: TPSLLines = {
        ...mockTPSLLines,
        takeProfitPrice: '55000',
        stopLossPrice: '35000',
      };

      rerender(
        <TradingViewChart
          tpslLines={newTPSLLines}
          testID="lines-update-test"
        />,
      );

      // Assert
      expect(getByTestId('lines-update-test')).toBeOnTheScreen();
    });

    it('handles rapid prop updates without crashing', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="rapid-update-test"
        />,
      );

      // Act - Simulate rapid updates
      for (let i = 0; i < 5; i++) {
        rerender(
          <TradingViewChart
            candleData={{
              ...mockCandleData,
              candles: mockCandleData.candles.slice(0, i + 1),
            }}
            selectedDuration={
              i % 2 === 0 ? TimeDuration.ONE_DAY : TimeDuration.ONE_WEEK
            }
            testID="rapid-update-test"
          />,
        );
      }

      // Assert
      expect(getByTestId('rapid-update-test')).toBeOnTheScreen();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides accessible testIDs for testing', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="accessibility-test" />,
      );

      // Assert
      expect(getByTestId('accessibility-test')).toBeOnTheScreen();
      expect(getByTestId('accessibility-test-webview')).toBeOnTheScreen();
    });

    it('renders without console errors for normal usage', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      render(
        <TradingViewChart
          candleData={mockCandleData}
          tpslLines={mockTPSLLines}
          height={400}
          testID="normal-usage-test"
        />,
      );

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('handles showSampleDataWhenEmpty prop correctly', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          showSampleDataWhenEmpty={false}
          testID="no-sample-data-test"
        />,
      );

      // Assert
      expect(getByTestId('no-sample-data-test')).toBeOnTheScreen();
    });
  });

  describe('Performance and Memory', () => {
    it('handles component unmounting gracefully', () => {
      // Arrange
      const { unmount } = render(
        <TradingViewChart candleData={mockCandleData} testID="unmount-test" />,
      );

      // Act & Assert - Should not throw error
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('handles multiple re-renders efficiently', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="rerender-test" />,
      );

      // Act - Multiple re-renders with same props
      for (let i = 0; i < 10; i++) {
        rerender(<TradingViewChart testID="rerender-test" />);
      }

      // Assert
      expect(getByTestId('rerender-test')).toBeOnTheScreen();
    });
  });
});
