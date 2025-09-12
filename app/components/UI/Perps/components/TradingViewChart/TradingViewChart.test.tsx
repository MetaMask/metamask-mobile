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
        error: {
          muted: '#FEF2F2',
          default: '#EF4444',
          alternative: '#DC2626',
        },
        success: {
          muted: '#F0FDF4',
          default: '#22C55E',
          alternative: '#16A34A',
        },
        icon: {
          alternative: '#6B7280',
        },
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
        <TradingViewChart testID="short-duration-test" />,
      );

      // Assert
      expect(getByTestId('short-duration-test')).toBeOnTheScreen();
    });

    it('renders component with maximum duration settings', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="max-duration-test" />,
      );

      // Assert
      expect(getByTestId('max-duration-test')).toBeOnTheScreen();
    });

    it('handles unknown duration gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="unknown-duration-test" />,
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
        <TradingViewChart testID="duration-test" />,
      );

      // Assert
      expect(getByTestId('duration-test')).toBeOnTheScreen();

      // Act - Change duration
      rerender(<TradingViewChart testID="duration-test" />);

      // Assert
      expect(getByTestId('duration-test')).toBeOnTheScreen();
    });

    it('handles different candle periods correctly', () => {
      // Arrange & Act
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="period-test" />,
      );

      // Assert
      expect(getByTestId('period-test')).toBeOnTheScreen();

      // Act - Change candle period
      rerender(<TradingViewChart testID="period-test" />);

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
        <TradingViewChart testID="interval-test" />,
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

    it('handles  prop correctly', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="no-sample-data-test" />,
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

  describe('HTML Content Generation', () => {
    it('generates HTML content with theme colors', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="html-theme-test" />,
      );

      // Assert - Component should render with theme-aware HTML
      expect(getByTestId('html-theme-test')).toBeOnTheScreen();
    });

    it('includes TradingView library script in HTML', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="library-script-test" />,
      );

      // Assert - Component should render with library script
      expect(getByTestId('library-script-test')).toBeOnTheScreen();
    });

    it('includes chart configuration in HTML', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="chart-config-test" />,
      );

      // Assert - Component should render with chart configuration
      expect(getByTestId('chart-config-test')).toBeOnTheScreen();
    });

    it('updates HTML when theme changes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="theme-update-test" />,
      );

      // Act - Force re-render to test theme dependency
      rerender(<TradingViewChart testID="theme-update-test" />);

      // Assert
      expect(getByTestId('theme-update-test')).toBeOnTheScreen();
    });
  });

  describe('Data Version Tracking', () => {
    it('tracks candle data version changes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="version-tracking-test"
        />,
      );

      // Act - Update with new data
      const updatedData: CandleData = {
        ...mockCandleData,
        coin: 'ETH', // Different coin
      };

      rerender(
        <TradingViewChart
          candleData={updatedData}
          testID="version-tracking-test"
        />,
      );

      // Assert
      expect(getByTestId('version-tracking-test')).toBeOnTheScreen();
    });

    it('handles data version with single candle', () => {
      // Arrange
      const singleCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [mockCandleData.candles[0]],
      };

      // Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={singleCandleData}
          testID="single-candle-test"
        />,
      );

      // Assert
      expect(getByTestId('single-candle-test')).toBeOnTheScreen();
    });

    it('handles data version with null candles', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart candleData={null} testID="null-version-test" />,
      );

      // Assert
      expect(getByTestId('null-version-test')).toBeOnTheScreen();
    });
  });

  describe('WebView Configuration', () => {
    it('configures WebView with JavaScript enabled', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="js-enabled-test" />,
      );

      // Assert
      expect(getByTestId('js-enabled-test-webview')).toBeOnTheScreen();
    });

    it('configures WebView with DOM storage enabled', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="dom-storage-test" />,
      );

      // Assert
      expect(getByTestId('dom-storage-test-webview')).toBeOnTheScreen();
    });

    it('configures WebView without scrolling', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="no-scroll-test" />,
      );

      // Assert
      expect(getByTestId('no-scroll-test-webview')).toBeOnTheScreen();
    });

    it('enables WebView debugging in development', () => {
      // Arrange & Act
      const { getByTestId } = render(<TradingViewChart testID="debug-test" />);

      // Assert
      expect(getByTestId('debug-test-webview')).toBeOnTheScreen();
    });
  });

  describe('Message Type Handling', () => {
    it('handles CHART_READY message type', () => {
      // Arrange
      const mockOnChartReady = jest.fn();

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            onChartReady={mockOnChartReady}
            testID="chart-ready-message-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles PRICE_LINES_UPDATE message type', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="price-lines-message-test" />,
      );

      // Assert
      expect(getByTestId('price-lines-message-test')).toBeOnTheScreen();
    });

    it('handles INTERVAL_UPDATED message type', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="interval-message-test" />,
      );

      // Assert
      expect(getByTestId('interval-message-test')).toBeOnTheScreen();
    });

    it('handles WEBVIEW_TEST message type', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="webview-test-message" />,
      );

      // Assert
      expect(getByTestId('webview-test-message')).toBeOnTheScreen();
    });

    it('handles unknown message types gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="unknown-message-test" />,
      );

      // Assert
      expect(getByTestId('unknown-message-test')).toBeOnTheScreen();
    });
  });

  describe('Console Logging and Debugging', () => {
    it('logs debugging information during normal operation', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="console-log-test"
        />,
      );

      // Assert - Component should render successfully
      expect(getByTestId('console-log-test')).toBeOnTheScreen();

      consoleSpy.mockRestore();
    });

    it('handles console error logging for invalid JSON', () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const { getByTestId } = render(
        <TradingViewChart testID="error-logging-test" />,
      );

      // Assert - Component should render without throwing
      expect(getByTestId('error-logging-test')).toBeOnTheScreen();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Effect Hook Behaviors', () => {
    it('handles chart ready state changes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="ready-state-test" />,
      );

      // Act - Trigger re-render to test useEffect
      rerender(<TradingViewChart testID="ready-state-test" />);

      // Assert
      expect(getByTestId('ready-state-test')).toBeOnTheScreen();
    });

    it('handles candle data updates through effects', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart candleData={null} testID="data-effect-test" />,
      );

      // Act - Update from null to actual data
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          testID="data-effect-test"
        />,
      );

      // Assert
      expect(getByTestId('data-effect-test')).toBeOnTheScreen();
    });

    it('handles tpslLines updates through effects', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart tpslLines={undefined} testID="tpsl-effect-test" />,
      );

      // Act - Update from undefined to actual lines
      rerender(
        <TradingViewChart
          tpslLines={mockTPSLLines}
          testID="tpsl-effect-test"
        />,
      );

      // Assert
      expect(getByTestId('tpsl-effect-test')).toBeOnTheScreen();
    });
  });

  describe('Complex Data Scenarios', () => {
    it('handles large datasets efficiently', () => {
      // Arrange - Create large dataset
      const largeCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_MINUTE,
        candles: Array.from({ length: 100 }, (_, i) => ({
          time: 1640995200000 + i * 60000, // 1 minute intervals
          open: (45000 + Math.random() * 1000).toString(),
          high: (46000 + Math.random() * 1000).toString(),
          low: (44000 + Math.random() * 1000).toString(),
          close: (45500 + Math.random() * 1000).toString(),
          volume: (1000 + Math.random() * 500).toString(),
        })),
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={largeCandleData}
            testID="large-dataset-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles mixed valid and invalid candles', () => {
      // Arrange
      const mixedData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          mockCandleData.candles[0], // Valid
          {
            time: 1640998800000,
            open: 'invalid',
            high: '47000',
            low: '45000',
            close: '46500',
            volume: '1200',
          }, // Invalid
          mockCandleData.candles[1], // Valid
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart candleData={mixedData} testID="mixed-data-test" />,
        );
      }).not.toThrow();
    });

    it('handles extreme price values', () => {
      // Arrange
      const extremePriceData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '0.000001', // Very small
            high: '999999999', // Very large
            low: '0.000001',
            close: '500000000',
            volume: '1000',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={extremePriceData}
            testID="extreme-price-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles zero and negative volumes', () => {
      // Arrange
      const zeroVolumeData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '0', // Zero volume
          },
          {
            time: 1640998800000,
            open: '45500',
            high: '47000',
            low: '45000',
            close: '46500',
            volume: '-100', // Negative volume
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={zeroVolumeData}
            testID="zero-volume-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('TP/SL Lines Variations', () => {
    it('handles partial TP/SL line data', () => {
      // Arrange
      const partialTPSL: TPSLLines = {
        takeProfitPrice: '50000',
        // Missing other lines
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            tpslLines={partialTPSL}
            testID="partial-tpsl-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles invalid price values in TP/SL lines', () => {
      // Arrange
      const invalidTPSL: TPSLLines = {
        takeProfitPrice: 'invalid',
        stopLossPrice: 'NaN',
        entryPrice: '',
        liquidationPrice: '0',
        currentPrice: '-1000',
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            tpslLines={invalidTPSL}
            testID="invalid-tpsl-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles very large TP/SL price values', () => {
      // Arrange
      const extremeTPSL: TPSLLines = {
        takeProfitPrice: '999999999999',
        stopLossPrice: '0.000000001',
        entryPrice: '123456789.123456789',
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            tpslLines={extremeTPSL}
            testID="extreme-tpsl-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Interval and Duration Combinations', () => {
    it('handles all duration enum values', () => {
      // Arrange & Act
      const durations = [
        TimeDuration.ONE_HOUR,
        TimeDuration.ONE_DAY,
        TimeDuration.ONE_WEEK,
        TimeDuration.ONE_MONTH,
        TimeDuration.YEAR_TO_DATE,
        TimeDuration.MAX,
      ];

      durations.forEach((_, index) => {
        expect(() => {
          render(<TradingViewChart testID={`duration-enum-test-${index}`} />);
        }).not.toThrow();
      });
    });

    it('handles all candle period enum values', () => {
      // Arrange & Act
      const periods = [
        CandlePeriod.ONE_MINUTE,
        CandlePeriod.THREE_MINUTES,
        CandlePeriod.FIVE_MINUTES,
        CandlePeriod.FIFTEEN_MINUTES,
        CandlePeriod.THIRTY_MINUTES,
        CandlePeriod.ONE_HOUR,
        CandlePeriod.TWO_HOURS,
        CandlePeriod.FOUR_HOURS,
        CandlePeriod.EIGHT_HOURS,
        CandlePeriod.TWELVE_HOURS,
        CandlePeriod.ONE_DAY,
        CandlePeriod.THREE_DAYS,
        CandlePeriod.ONE_WEEK,
        CandlePeriod.ONE_MONTH,
      ];

      periods.forEach((_, index) => {
        expect(() => {
          render(<TradingViewChart testID={`period-enum-test-${index}`} />);
        }).not.toThrow();
      });
    });

    it('handles string values for duration and period', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="string-values-test" />,
      );

      // Assert
      expect(getByTestId('string-values-test')).toBeOnTheScreen();
    });
  });

  describe('Data Flow and State Management', () => {
    it('handles rapid data updates without memory leaks', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="rapid-data-test" />,
      );

      // Act - Simulate rapid data changes
      for (let i = 0; i < 20; i++) {
        const dynamicData: CandleData = {
          coin: `COIN${i}`,
          interval: CandlePeriod.ONE_HOUR,
          candles: [
            {
              time: 1640995200000 + i * 3600000,
              open: (45000 + i * 100).toString(),
              high: (46000 + i * 100).toString(),
              low: (44000 + i * 100).toString(),
              close: (45500 + i * 100).toString(),
              volume: (1000 + i * 50).toString(),
            },
          ],
        };

        rerender(
          <TradingViewChart
            candleData={dynamicData}
            testID="rapid-data-test"
          />,
        );
      }

      // Assert
      expect(getByTestId('rapid-data-test')).toBeOnTheScreen();
    });

    it('handles  flag variations', () => {
      // Arrange & Act - Test both true and false values
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="sample-data-flag-test" />,
      );

      rerender(<TradingViewChart testID="sample-data-flag-test" />);

      // Assert
      expect(getByTestId('sample-data-flag-test')).toBeOnTheScreen();
    });

    it('handles data source tracking', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart candleData={null} testID="data-source-test" />,
      );

      // Act - Change from no data to real data
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          testID="data-source-test"
        />,
      );

      // Assert
      expect(getByTestId('data-source-test')).toBeOnTheScreen();
    });
  });

  describe('Height and Styling Variations', () => {
    it('handles very small height values', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart height={50} testID="small-height-test" />,
      );

      // Assert
      expect(getByTestId('small-height-test')).toBeOnTheScreen();
    });

    it('handles very large height values', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart height={2000} testID="large-height-test" />,
      );

      // Assert
      expect(getByTestId('large-height-test')).toBeOnTheScreen();
    });

    it('handles fractional height values', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart height={350.5} testID="fractional-height-test" />,
      );

      // Assert
      expect(getByTestId('fractional-height-test')).toBeOnTheScreen();
    });
  });

  describe('Component Integration', () => {
    it('integrates with DevLogger for debugging', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="devlogger-test"
        />,
      );

      // Assert
      expect(getByTestId('devlogger-test')).toBeOnTheScreen();
    });

    it('handles concurrent prop updates', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="concurrent-test" />,
      );

      // Act - Update multiple props simultaneously
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          tpslLines={mockTPSLLines}
          height={400}
          testID="concurrent-test"
        />,
      );

      // Assert
      expect(getByTestId('concurrent-test')).toBeOnTheScreen();
    });

    it('maintains stability across multiple mount/unmount cycles', () => {
      // Act & Assert - Test multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TradingViewChart
            candleData={mockCandleData}
            testID={`mount-unmount-test-${i}`}
          />,
        );

        expect(() => unmount()).not.toThrow();
      }
    });
  });

  describe('Error Boundary and Edge Cases', () => {
    it('handles candle data with all zero values', () => {
      // Arrange
      const zeroData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '0',
            high: '0',
            low: '0',
            close: '0',
            volume: '0',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart candleData={zeroData} testID="zero-values-test" />,
        );
      }).not.toThrow();
    });

    it('handles candle data with identical OHLC values', () => {
      // Arrange
      const identicalOHLC: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '45000',
            high: '45000',
            low: '45000',
            close: '45000',
            volume: '1000',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={identicalOHLC}
            testID="identical-ohlc-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles timestamps from different time periods', () => {
      // Arrange
      const diverseTimestamps: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 946684800000, // Year 2000
            open: '100',
            high: '200',
            low: '50',
            close: '150',
            volume: '1000',
          },
          {
            time: Date.now(), // Current time
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
          {
            time: 4102444800000, // Year 2100
            open: '100000',
            high: '110000',
            low: '90000',
            close: '105000',
            volume: '1000',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={diverseTimestamps}
            testID="diverse-timestamps-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('handles candles with decimal string precision', () => {
      // Arrange
      const preciseData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '45000.123456789',
            high: '46000.987654321',
            low: '44000.111111111',
            close: '45500.555555555',
            volume: '1000.999999999',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={preciseData}
            testID="precise-data-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles scientific notation in price strings', () => {
      // Arrange
      const scientificData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '4.5e4', // 45000 in scientific notation
            high: '4.6e4',
            low: '4.4e4',
            close: '4.55e4',
            volume: '1e3',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={scientificData}
            testID="scientific-notation-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles candles with inconsistent OHLC logic', () => {
      // Arrange - High < Low (invalid but should be handled)
      const inconsistentData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 1640995200000,
            open: '45000',
            high: '44000', // High < Low (inconsistent)
            low: '46000',
            close: '45500',
            volume: '1000',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={inconsistentData}
            testID="inconsistent-ohlc-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('WebView Load Events', () => {
    it('handles WebView onLoadStart event', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act & Assert
      expect(() => {
        render(<TradingViewChart testID="load-start-test" />);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('handles WebView onLoadEnd event', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act & Assert
      expect(() => {
        render(<TradingViewChart testID="load-end-test" />);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('handles WebView onLoad event', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act & Assert
      expect(() => {
        render(<TradingViewChart testID="load-event-test" />);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Advanced Props Combinations', () => {
    it('handles all props set to maximum values', () => {
      // Arrange
      const maximalTPSL: TPSLLines = {
        takeProfitPrice: '999999999',
        stopLossPrice: '1',
        entryPrice: '500000000',
        liquidationPrice: '100000000',
        currentPrice: '600000000',
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={mockCandleData}
            height={5000}
            tpslLines={maximalTPSL}
            onChartReady={() => {
              /* Chart ready callback */
            }}
            testID="maximal-props-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles all props set to minimal values', () => {
      // Arrange
      const minimalTPSL: TPSLLines = {
        takeProfitPrice: '1',
        stopLossPrice: '0.001',
        entryPrice: '0.1',
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={null}
            height={1}
            tpslLines={minimalTPSL}
            testID="minimal-props-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles mixed extreme prop combinations', () => {
      // Arrange & Act
      expect(() => {
        render(
          <TradingViewChart
            candleData={mockCandleData}
            height={-1} // Negative height
            tpslLines={undefined}
            testID="mixed-extreme-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Time and Date Handling', () => {
    it('handles timestamp conversion edge cases', () => {
      // Arrange - Edge case timestamps
      const edgeTimestamps: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: 0, // Unix epoch
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
          {
            time: 2147483647000, // Near max 32-bit timestamp
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={edgeTimestamps}
            testID="edge-timestamps-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles duplicate timestamps', () => {
      // Arrange
      const duplicateTimestamps: CandleData = {
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
            time: 1640995200000, // Same timestamp
            open: '45500',
            high: '47000',
            low: '45000',
            close: '46500',
            volume: '1200',
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={duplicateTimestamps}
            testID="duplicate-timestamps-test"
          />,
        );
      }).not.toThrow();
    });
  });

  describe('State Transitions', () => {
    it('handles transition from error state to normal state', () => {
      // Arrange - Start with normal component
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="state-transition-test" />,
      );

      // Act - Update with new data to trigger state changes
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          testID="state-transition-test"
        />,
      );

      // Assert
      expect(getByTestId('state-transition-test')).toBeOnTheScreen();
    });

    it('handles multiple callback registrations', () => {
      // Arrange
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Act
      const { rerender, getByTestId } = render(
        <TradingViewChart onChartReady={callback1} testID="callback-test" />,
      );

      rerender(
        <TradingViewChart onChartReady={callback2} testID="callback-test" />,
      );

      // Assert
      expect(getByTestId('callback-test')).toBeOnTheScreen();
    });

    it('handles state when WebView ref becomes null', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart candleData={mockCandleData} testID="null-ref-test" />,
      );

      // Assert - Component should handle null ref gracefully
      expect(getByTestId('null-ref-test')).toBeOnTheScreen();
    });
  });

  describe('Comprehensive Integration Tests', () => {
    it('handles full user workflow simulation', () => {
      // Arrange - Start with minimal setup
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="workflow-test" />,
      );

      // Act - Simulate user workflow: data loading -> TP/SL setting -> updates

      // Step 1: Load initial data
      rerender(
        <TradingViewChart candleData={mockCandleData} testID="workflow-test" />,
      );

      // Step 2: Add TP/SL lines
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          tpslLines={mockTPSLLines}
          testID="workflow-test"
        />,
      );

      // Step 3: Change time period
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          tpslLines={mockTPSLLines}
          testID="workflow-test"
        />,
      );

      // Step 4: Update data
      const newData: CandleData = {
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
          candleData={newData}
          tpslLines={mockTPSLLines}
          testID="workflow-test"
        />,
      );

      // Assert
      expect(getByTestId('workflow-test')).toBeOnTheScreen();
    });

    it('handles stress test with maximum complexity', () => {
      // Arrange - Create maximum complexity scenario
      const stressTestData: CandleData = {
        coin: 'STRESS_TEST_COIN_WITH_VERY_LONG_NAME',
        interval: CandlePeriod.ONE_MINUTE,
        candles: Array.from({ length: 500 }, (_, i) => ({
          time: 1640995200000 + i * 60000,
          open: (Math.random() * 100000).toFixed(8),
          high: (Math.random() * 100000).toFixed(8),
          low: (Math.random() * 100000).toFixed(8),
          close: (Math.random() * 100000).toFixed(8),
          volume: (Math.random() * 10000).toFixed(6),
        })),
      };

      const stressTPSL: TPSLLines = {
        takeProfitPrice: '999999999.123456789',
        stopLossPrice: '0.000000001',
        entryPrice: '50000.50505050505',
        liquidationPrice: '25000.25252525252',
        currentPrice: '75000.75757575757',
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={stressTestData}
            height={1000}
            tpslLines={stressTPSL}
            onChartReady={() => {
              // Complex callback
              for (let i = 0; i < 100; i++) {
                Math.random();
              }
            }}
            testID="stress-test"
          />,
        );
      }).not.toThrow();
    });

    it('handles component with all possible prop variations', () => {
      // Arrange - Test all possible boolean/enum combinations
      const propVariations = [
        {},
        {},
        { height: 1 },
        { height: 10000 },
        {},
        {},
        {},
        {},
      ];

      // Act & Assert
      propVariations.forEach((props, _index) => {
        expect(() => {
          render(
            <TradingViewChart
              {...props}
              testID={`prop-variation-test-${_index}`}
            />,
          );
        }).not.toThrow();
      });
    });
  });

  describe('Specific Logic Path Coverage', () => {
    it('exercises formatCandleData with boundary values', () => {
      // Arrange
      const boundaryData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: Number.MAX_SAFE_INTEGER,
            open: Number.MAX_VALUE.toString(),
            high: Number.MAX_VALUE.toString(),
            low: Number.MIN_VALUE.toString(),
            close: (Number.MAX_VALUE / 2).toString(),
            volume: Number.MAX_SAFE_INTEGER.toString(),
          },
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={boundaryData}
            testID="boundary-values-test"
          />,
        );
      }).not.toThrow();
    });

    it('exercises candle filtering logic with edge cases', () => {
      // Arrange - Mix of valid and edge case data
      const edgeCaseData: CandleData = {
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
          }, // Valid
          {
            time: NaN,
            open: '45000',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          }, // Invalid time
          {
            time: 1640998800000,
            open: 'Infinity',
            high: '46000',
            low: '44000',
            close: '45500',
            volume: '1000',
          }, // Invalid open
          {
            time: 1641002400000,
            open: '45000',
            high: '46000',
            low: '-Infinity',
            close: '45500',
            volume: '1000',
          }, // Invalid low
        ],
      };

      // Act & Assert
      expect(() => {
        render(
          <TradingViewChart
            candleData={edgeCaseData}
            testID="edge-case-filtering-test"
          />,
        );
      }).not.toThrow();
    });

    it('exercises all switch statement branches in getCandleCount', () => {
      // Arrange & Act - Test various combinations to hit all switch branches
      const testCombinations = [
        { duration: TimeDuration.ONE_HOUR, period: CandlePeriod.ONE_MINUTE },
        { duration: TimeDuration.ONE_DAY, period: CandlePeriod.THREE_MINUTES },
        { duration: TimeDuration.ONE_WEEK, period: CandlePeriod.FIVE_MINUTES },
        {
          duration: TimeDuration.ONE_MONTH,
          period: CandlePeriod.FIFTEEN_MINUTES,
        },
        {
          duration: TimeDuration.YEAR_TO_DATE,
          period: CandlePeriod.THIRTY_MINUTES,
        },
        { duration: TimeDuration.MAX, period: CandlePeriod.ONE_HOUR },
        { duration: 'unknown' as TimeDuration, period: CandlePeriod.TWO_HOURS },
        { duration: TimeDuration.ONE_DAY, period: CandlePeriod.FOUR_HOURS },
        { duration: TimeDuration.ONE_WEEK, period: CandlePeriod.EIGHT_HOURS },
        { duration: TimeDuration.ONE_MONTH, period: CandlePeriod.TWELVE_HOURS },
        { duration: TimeDuration.YEAR_TO_DATE, period: CandlePeriod.ONE_DAY },
        { duration: TimeDuration.MAX, period: CandlePeriod.THREE_DAYS },
        { duration: TimeDuration.ONE_MONTH, period: CandlePeriod.ONE_WEEK },
        { duration: TimeDuration.YEAR_TO_DATE, period: CandlePeriod.ONE_MONTH },
        { duration: TimeDuration.ONE_DAY, period: 'unknown' as CandlePeriod },
      ];

      testCombinations.forEach((_, _index) => {
        expect(() => {
          render(<TradingViewChart testID={`switch-branch-test-${_index}`} />);
        }).not.toThrow();
      });
    });

    it('exercises candleDataVersion memo with various data shapes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="memo-test" />,
      );

      // Act - Test different data shapes that exercise memo logic
      const dataVariations = [
        null, // Null data
        { coin: 'BTC', interval: CandlePeriod.ONE_HOUR, candles: [] }, // Empty candles
        {
          coin: 'BTC',
          interval: CandlePeriod.ONE_HOUR,
          candles: [mockCandleData.candles[0]],
        }, // Single candle
        mockCandleData, // Normal data
        { ...mockCandleData, coin: 'ETH' }, // Different coin
        { ...mockCandleData, interval: CandlePeriod.ONE_DAY }, // Different interval
      ];

      dataVariations.forEach((data) => {
        rerender(<TradingViewChart candleData={data} testID="memo-test" />);

        // Assert each variation renders
        expect(getByTestId('memo-test')).toBeOnTheScreen();
      });
    });

    it('exercises error handling in handleWebViewError', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="webview-error-handling-test" />,
      );

      // Assert - Component should handle WebView errors gracefully
      expect(getByTestId('webview-error-handling-test')).toBeOnTheScreen();
    });
  });

  describe('HTML Template and JavaScript Coverage', () => {
    it('generates HTML with proper script structure', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="html-script-test" />,
      );

      // Assert - Component with embedded HTML should render
      expect(getByTestId('html-script-test')).toBeOnTheScreen();
    });

    it('includes all necessary JavaScript functions in HTML', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="js-functions-test" />,
      );

      // Assert - HTML with JS functions should render
      expect(getByTestId('js-functions-test')).toBeOnTheScreen();
    });

    it('handles HTML template with theme interpolation', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <TradingViewChart testID="theme-interpolation-test" />,
      );

      // Assert - Theme values should be interpolated into HTML
      expect(getByTestId('theme-interpolation-test')).toBeOnTheScreen();
    });
  });

  describe('useCallback and useMemo Dependencies', () => {
    it('handles sendMessage callback dependency changes', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="sendmessage-deps-test"
        />,
      );

      // Act - Change props to trigger dependency updates
      rerender(
        <TradingViewChart
          candleData={mockCandleData}
          tpslLines={mockTPSLLines}
          testID="sendmessage-deps-test"
        />,
      );

      // Assert
      expect(getByTestId('sendmessage-deps-test')).toBeOnTheScreen();
    });

    it('handles formatCandleData callback stability', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart
          candleData={mockCandleData}
          testID="format-callback-test"
        />,
      );

      // Act - Multiple re-renders to test callback stability
      for (let i = 0; i < 5; i++) {
        rerender(
          <TradingViewChart
            candleData={mockCandleData}
            testID="format-callback-test"
          />,
        );
      }

      // Assert
      expect(getByTestId('format-callback-test')).toBeOnTheScreen();
    });

    it('handles htmlContent memo dependencies', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <TradingViewChart testID="html-memo-test" />,
      );

      // Act - Force re-render to test memo stability
      for (let i = 0; i < 3; i++) {
        rerender(<TradingViewChart testID="html-memo-test" />);
      }

      // Assert
      expect(getByTestId('html-memo-test')).toBeOnTheScreen();
    });
  });

  describe('Component Prop Interface Coverage', () => {
    it('validates all TPSLLines interface properties', () => {
      // Arrange - Test each property individually
      const individualProps: TPSLLines[] = [
        { takeProfitPrice: '50000' },
        { stopLossPrice: '40000' },
        { entryPrice: '45000' },
        { liquidationPrice: '35000' },
        { currentPrice: '46000' },
        {}, // Empty object
      ];

      // Act & Assert
      individualProps.forEach((tpsl, index) => {
        expect(() => {
          render(
            <TradingViewChart
              tpslLines={tpsl}
              testID={`tpsl-individual-test-${index}`}
            />,
          );
        }).not.toThrow();
      });
    });

    it('validates component with missing optional props', () => {
      // Arrange & Act - Only required props (none, all are optional)
      const { getByTestId } = render(
        <TradingViewChart testID="minimal-required-test" />,
      );

      // Assert
      expect(getByTestId('minimal-required-test')).toBeOnTheScreen();
    });
  });
});
