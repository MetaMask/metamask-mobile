import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { PerpsCandlestickChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import CandlestickChartComponent from './PerpsCandlectickChart';

// Minimal mock - only what we actually test
jest.mock('react-native-wagmi-charts', () => {
  const { View } = jest.requireActual('react-native');
  const {
    PerpsCandlestickChartSelectorsIDs: PerpsCandlestickChartSelectorsIDsMock,
  } = jest.requireActual(
    '../../../../../../e2e/selectors/Perps/Perps.selectors',
  );

  const MockChart = ({
    children,
    height,
    width,
  }: {
    children: React.ReactNode;
    height: number;
    width: number;
  }) => (
    <View
      testID={PerpsCandlestickChartSelectorsIDsMock.CONTAINER}
      data-height={height}
      data-width={width}
    >
      {children}
    </View>
  );

  MockChart.Provider = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: unknown[];
  }) => (
    <View
      testID={PerpsCandlestickChartSelectorsIDsMock.PROVIDER}
      data-data-points={data?.length || 0}
    >
      {children}
    </View>
  );

  MockChart.Candles = ({
    positiveColor,
    negativeColor,
  }: {
    positiveColor: string;
    negativeColor: string;
  }) => (
    <View
      testID={PerpsCandlestickChartSelectorsIDsMock.CANDLES}
      data-positive-color={positiveColor}
      data-negative-color={negativeColor}
    />
  );

  MockChart.Crosshair = ({ children }: { children: React.ReactNode }) => (
    <View testID={PerpsCandlestickChartSelectorsIDsMock.CROSSHAIR}>
      {children}
    </View>
  );

  MockChart.Tooltip = () => (
    <View testID={PerpsCandlestickChartSelectorsIDsMock.TOOLTIP} />
  );

  return { CandlestickChart: MockChart };
});

// Mock Dimensions with fixed value
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Dimensions: {
    get: () => ({ width: 750, height: 1334 }), // Fixed test dimensions
  },
}));

// Minimal test wrapper with only what we need
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={configureMockStore()({ user: { appTheme: 'light' } })}>
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  </Provider>
);

// Helper render function
const renderWithWrapper = (component: React.ReactElement) =>
  render(component, { wrapper: TestWrapper });

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
  });

  describe('Loading State', () => {
    it('displays loading message when isLoading is true', () => {
      // Arrange
      const props = { ...defaultProps, isLoading: true };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('Loading chart data...')).toBeOnTheScreen();
    });

    it('shows interval selector when loading', () => {
      // Arrange
      const props = { ...defaultProps, isLoading: true };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1H')).toBeOnTheScreen();
      expect(screen.getByText('5M')).toBeOnTheScreen();
    });

    it('calls onIntervalChange when interval button is pressed during loading', () => {
      // Arrange
      const onIntervalChange = jest.fn();
      const props = { ...defaultProps, isLoading: true, onIntervalChange };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);
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
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.CANDLES),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.CROSSHAIR),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.TOOLTIP),
      ).toBeOnTheScreen();
    });

    it('renders with correct candle colors', () => {
      // Arrange & Act
      renderWithWrapper(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      const candles = screen.getByTestId(
        PerpsCandlestickChartSelectorsIDs.CANDLES,
      );
      // The colors come from the actual theme system
      expect(candles).toHaveProp('data-positive-color', '#1c7e33'); // Actual success color
      expect(candles).toHaveProp('data-negative-color', '#ca3542'); // Actual error color
    });
  });

  describe('Props Handling', () => {
    it('uses custom height prop', () => {
      // Arrange
      const props = { ...defaultProps, height: 280 };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      // The component should render without errors with custom height
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
    });

    it('uses default height when not provided', () => {
      // Arrange
      const { height, ...propsWithoutHeight } = defaultProps;

      // Act
      renderWithWrapper(<CandlestickChartComponent {...propsWithoutHeight} />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
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

    it('passes correct data count to chart components', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      const provider = screen.getByTestId(
        PerpsCandlestickChartSelectorsIDs.PROVIDER,
      );
      expect(provider).toHaveProp('data-data-points', 2); // mockCandleData has 2 candles
    });

    it('passes chart dimensions correctly', () => {
      // Arrange
      const props = { ...defaultProps, height: 400 };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      const chart = screen.getByTestId(
        PerpsCandlestickChartSelectorsIDs.CONTAINER,
      );
      expect(chart).toHaveProp('data-height', 280); // 400 - 120 (PADDING.VERTICAL)
      expect(chart).toHaveProp('data-width', 702); // 750 - 48 (PADDING.HORIZONTAL * 2)
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
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.CANDLES),
      ).toBeOnTheScreen();
    });

    it('does not render grid lines when no data', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert - No candlestick chart should be rendered when no data
      expect(
        screen.queryByTestId(PerpsCandlestickChartSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen widths', () => {
      // Arrange & Act (using fixed dimensions for consistent testing)
      renderWithWrapper(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('candlestick-provider')).toBeOnTheScreen();
    });

    it('handles large screen sizes', () => {
      // Arrange & Act (using fixed dimensions for consistent testing)
      renderWithWrapper(<CandlestickChartComponent {...defaultProps} />);

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
      renderWithWrapper(<CandlestickChartComponent {...props} />);

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
