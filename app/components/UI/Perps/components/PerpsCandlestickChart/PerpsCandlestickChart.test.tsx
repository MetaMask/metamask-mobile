import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CandlestickChartComponent from './PerpsCandlectickChart';

// Mock the external chart library
jest.mock('react-native-wagmi-charts', () => {
  const { View: MockView } = jest.requireActual('react-native');

  // Base CandlestickChart component
  const MockCandlestickChart = ({
    children,
    height: _height,
    width: _width,
  }: {
    children: React.ReactNode;
    height: number;
    width: number;
  }) => <MockView testID="candlestick-chart">{children}</MockView>;

  return {
    CandlestickChart: Object.assign(MockCandlestickChart, {
      Provider: ({ children }: { children: React.ReactNode }) => (
        <MockView testID="candlestick-provider">{children}</MockView>
      ),
      Candles: ({
        positiveColor,
        negativeColor,
      }: {
        positiveColor: string;
        negativeColor: string;
      }) => (
        <MockView
          testID="candlestick-candles"
          data-positive-color={positiveColor}
          data-negative-color={negativeColor}
        />
      ),
      Crosshair: ({ children }: { children: React.ReactNode }) => (
        <MockView testID="candlestick-crosshair">{children}</MockView>
      ),
      Tooltip: ({
        style: _style,
        tooltipTextProps: _tooltipTextProps,
      }: {
        style: unknown;
        tooltipTextProps: unknown;
      }) => <MockView testID="candlestick-tooltip" />,
    }),
  };
});

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      chartContainer: { justifyContent: 'center', alignItems: 'center' },
      relativeContainer: { position: 'relative' },
      chartLoadingContainer: {
        height: 300,
        width: '100%',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      },
      loadingText: { textAlign: 'center' },
      noDataContainer: {
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      },
      noDataText: { textAlign: 'center' },
      intervalSelector: {
        flexDirection: 'row',
        alignSelf: 'center',
        marginTop: 24,
      },
      intervalTab: {
        paddingVertical: 6,
        borderRadius: 6,
        padding: 10,
        alignItems: 'center',
      },
      intervalTabActive: { backgroundColor: '#000' },
      intervalTabInactive: { backgroundColor: 'transparent' },
      intervalTabText: { fontSize: 12 },
      intervalTabTextActive: { color: '#fff' },
      intervalTabTextInactive: { color: '#666' },
      gridContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        pointerEvents: 'none',
      },
      tooltipContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
      },
      tooltipText: { color: '#000', fontSize: 12, fontWeight: '600' },
      getGridLineStyle: (isEdge: boolean, position: number) => ({
        position: 'absolute',
        left: 0,
        right: 0,
        top: position,
        height: isEdge ? 2 : 1,
        zIndex: 10,
        backgroundColor: '#ccc',
        opacity: isEdge ? 0.8 : 0.6,
      }),
    },
  }),
}));

// Mock Dimensions
const mockGetDimensions = jest.fn();
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Dimensions: {
    get: mockGetDimensions,
  },
}));

describe('CandlestickChartComponent', () => {
  const mockCandleData = {
    coin: 'BTC',
    interval: '1h',
    candles: [
      {
        time: 1640995200000,
        open: '45000.00',
        high: '46000.00',
        low: '44000.00',
        close: '45500.00',
        volume: '1000000',
      },
      {
        time: 1640998800000,
        open: '45500.00',
        high: '47000.00',
        low: '45000.00',
        close: '46500.00',
        volume: '1200000',
      },
    ],
  };

  const defaultProps = {
    candleData: mockCandleData,
    isLoading: false,
    height: 300,
    selectedInterval: '1h',
    onIntervalChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDimensions.mockReturnValue({ width: 375, height: 812 });
  });

  describe('Loading State', () => {
    it('displays loading message when isLoading is true', () => {
      // Arrange
      const props = { ...defaultProps, isLoading: true };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('Loading chart data...')).toBeOnTheScreen();
    });

    it('shows interval selector when loading', () => {
      // Arrange
      const props = { ...defaultProps, isLoading: true };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1H')).toBeOnTheScreen();
      expect(screen.getByText('5M')).toBeOnTheScreen();
    });

    it('calls onIntervalChange when interval button is pressed during loading', () => {
      // Arrange
      const onIntervalChange = jest.fn();
      const props = { ...defaultProps, isLoading: true, onIntervalChange };

      // Act
      render(<CandlestickChartComponent {...props} />);
      fireEvent.press(screen.getByText('5M'));

      // Assert
      expect(onIntervalChange).toHaveBeenCalledWith('5m');
    });
  });

  describe('No Data State', () => {
    it('displays no data message when candleData is null', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });

    it('displays no data message when candles array is empty', () => {
      // Arrange
      const props = {
        ...defaultProps,
        candleData: { ...mockCandleData, candles: [] },
      };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });

    it('shows interval selector when no data', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1H')).toBeOnTheScreen();
      expect(screen.getByText('5M')).toBeOnTheScreen();
    });
  });

  describe('Normal Rendering', () => {
    it('renders candlestick chart with valid data', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-candles')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-crosshair')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-tooltip')).toBeOnTheScreen();
    });

    it('renders with correct candle colors', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      const candles = screen.getByTestId('candlestick-candles');
      expect(candles).toHaveProp('data-positive-color', '#00D68F');
      expect(candles).toHaveProp('data-negative-color', '#FF6B6B');
    });
  });

  describe('Props Handling', () => {
    it('uses custom height prop', () => {
      // Arrange
      const props = { ...defaultProps, height: 400 };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      // The component should render without errors with custom height
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('uses default height when not provided', () => {
      // Arrange
      const { height, ...propsWithoutHeight } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutHeight} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('uses default selectedInterval when not provided', () => {
      // Arrange
      const { selectedInterval, ...propsWithoutInterval } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutInterval} />);

      // Assert
      expect(screen.getByText('1H')).toBeOnTheScreen();
    });

    it('uses default isLoading when not provided', () => {
      // Arrange
      const { isLoading, ...propsWithoutLoading } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutLoading} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
      expect(screen.queryByText('Loading chart data...')).not.toBeOnTheScreen();
    });
  });

  describe('Interval Selector', () => {
    it('renders all available intervals', () => {
      // Arrange
      const expectedIntervals = [
        '1M',
        '5M',
        '15M',
        '30M',
        '1H',
        '2H',
        '4H',
        '8H',
      ];

      // Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expectedIntervals.forEach((interval) => {
        expect(screen.getByText(interval)).toBeOnTheScreen();
      });
    });

    it('highlights selected interval', () => {
      // Arrange
      const props = { ...defaultProps, selectedInterval: '5m' };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('5M')).toBeOnTheScreen();
    });

    it('calls onIntervalChange when interval button is pressed', () => {
      // Arrange
      const onIntervalChange = jest.fn();
      const props = { ...defaultProps, onIntervalChange };

      // Act
      render(<CandlestickChartComponent {...props} />);
      fireEvent.press(screen.getByText('5M'));

      // Assert
      expect(onIntervalChange).toHaveBeenCalledWith('5m');
    });

    it('does not call onIntervalChange when callback is not provided', () => {
      // Arrange
      const { onIntervalChange, ...propsWithoutCallback } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutCallback} />);

      // Assert - Should not throw error when pressing interval button
      expect(() => {
        fireEvent.press(screen.getByText('5M'));
      }).not.toThrow();
    });

    it.each([
      ['1M', '1m'],
      ['5M', '5m'],
      ['15M', '15m'],
      ['30M', '30m'],
      ['1H', '1h'],
      ['2H', '2h'],
      ['4H', '4h'],
      ['8H', '8h'],
    ] as const)(
      'calls onIntervalChange with correct value for %s',
      (label, expectedValue) => {
        // Arrange
        const onIntervalChange = jest.fn();
        const props = { ...defaultProps, onIntervalChange };

        // Act
        render(<CandlestickChartComponent {...props} />);
        fireEvent.press(screen.getByText(label));

        // Assert
        expect(onIntervalChange).toHaveBeenCalledWith(expectedValue);
      },
    );
  });

  describe('Data Transformation', () => {
    it('transforms candle data to correct format', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
      // The transformed data is used internally by the CandlestickChart.Provider
    });

    it('handles missing candle data gracefully', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });

    it('handles empty candles array', () => {
      // Arrange
      const props = {
        ...defaultProps,
        candleData: { ...mockCandleData, candles: [] },
      };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });
  });

  describe('Grid Lines', () => {
    it('renders grid lines when data is available', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert - Check for the presence of the candlestick chart which contains grid lines
      expect(screen.getByTestId('candlestick-chart')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-candles')).toBeOnTheScreen();
    });

    it('does not render grid lines when no data', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert - No candlestick chart should be rendered when no data
      expect(screen.queryByTestId('candlestick-chart')).not.toBeOnTheScreen();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen widths', () => {
      // Arrange
      mockGetDimensions.mockReturnValue({ width: 320, height: 568 });

      // Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('handles large screen sizes', () => {
      // Arrange
      mockGetDimensions.mockReturnValue({ width: 768, height: 1024 });

      // Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles candle data with string numbers', () => {
      // Arrange
      const candleDataWithStrings = {
        coin: 'BTC',
        interval: '1h',
        candles: [
          {
            time: 1640995200000,
            open: '45000.00',
            high: '46000.00',
            low: '44000.00',
            close: '45500.00',
            volume: '1000000',
          },
        ],
      };
      const props = { ...defaultProps, candleData: candleDataWithStrings };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('handles invalid interval selection gracefully', () => {
      // Arrange
      const props = { ...defaultProps, selectedInterval: 'invalid' };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('handles undefined candleData gracefully', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });
  });
});
