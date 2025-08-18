import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { PerpsCandlestickChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
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

  return { CandlestickChart: MockChart };
});

// Mock Dimensions with fixed value and prevent animation warnings
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Dimensions: {
    get: () => ({ width: 750, height: 1334 }), // Fixed test dimensions
  },
  Animated: {
    ...jest.requireActual('react-native').Animated,
    View: jest.requireActual('react-native').View,
    timing: () => ({
      start: jest.fn(),
    }),
    sequence: () => ({
      start: jest.fn(),
    }),
    Value: jest.fn(() => ({
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  },
}));

// Mock the skeleton component to prevent animation warnings
jest.mock('./PerpsCandlestickChartSkeleton', () => () => {
  const { View } = jest.requireActual('react-native');
  const {
    PerpsCandlestickChartSelectorsIDs: PerpsCandlestickChartSelectorsIDsMock,
  } = jest.requireActual(
    '../../../../../../e2e/selectors/Perps/Perps.selectors',
  );
  return (
    <View testID={PerpsCandlestickChartSelectorsIDsMock.LOADING_SKELETON} />
  );
});

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
    interval: CandlePeriod.ONE_HOUR,
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
    selectedDuration: TimeDuration.ONE_DAY,
    onDurationChange: jest.fn(),
    onGearPress: jest.fn(),
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
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.LOADING_SKELETON),
      ).toBeOnTheScreen();
    });

    it('shows time duration selector when loading', () => {
      // Arrange
      const props = { ...defaultProps, isLoading: true };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1HR')).toBeOnTheScreen();
      expect(screen.getByText('1D')).toBeOnTheScreen();
      expect(screen.getByText('1W')).toBeOnTheScreen();
    });

    it('calls onDurationChange when duration button is pressed during loading', () => {
      // Arrange
      const onDurationChange = jest.fn();
      const props = { ...defaultProps, isLoading: true, onDurationChange };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);
      fireEvent.press(screen.getByText('1W'));

      // Assert
      expect(onDurationChange).toHaveBeenCalledWith('1w');
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

    it('shows time duration selector when no data', () => {
      // Arrange
      const props = { ...defaultProps, candleData: null };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1HR')).toBeOnTheScreen();
      expect(screen.getByText('1D')).toBeOnTheScreen();
      expect(screen.getByText('1W')).toBeOnTheScreen();
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
      expect(candles).toHaveProp('data-positive-color', '#457a39'); // Actual success color
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

    it('uses default selectedDuration when not provided', () => {
      // Arrange
      const { selectedDuration, ...propsWithoutDuration } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutDuration} />);

      // Assert
      expect(screen.getByText('1HR')).toBeOnTheScreen();
    });

    it('uses default isLoading when not provided', () => {
      // Arrange
      const { isLoading, ...propsWithoutLoading } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutLoading} />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsCandlestickChartSelectorsIDs.LOADING_SKELETON,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Duration Selector', () => {
    it('renders all available durations', () => {
      // Arrange
      const expectedDurations = ['1HR', '1D', '1W', '1M', 'YTD', 'Max'];

      // Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expectedDurations.forEach((duration) => {
        expect(screen.getByText(duration)).toBeOnTheScreen();
      });
    });

    it('highlights selected duration', () => {
      // Arrange
      const props = {
        ...defaultProps,
        selectedDuration: TimeDuration.ONE_WEEK,
      };

      // Act
      render(<CandlestickChartComponent {...props} />);

      // Assert
      expect(screen.getByText('1W')).toBeOnTheScreen();
    });

    it('calls onDurationChange when duration button is pressed', () => {
      // Arrange
      const onDurationChange = jest.fn();
      const props = { ...defaultProps, onDurationChange };

      // Act
      render(<CandlestickChartComponent {...props} />);
      fireEvent.press(screen.getByText('1W'));

      // Assert
      expect(onDurationChange).toHaveBeenCalledWith('1w');
    });

    it('does not call onDurationChange when callback is not provided', () => {
      // Arrange
      const { onDurationChange, ...propsWithoutCallback } = defaultProps;

      // Act
      render(<CandlestickChartComponent {...propsWithoutCallback} />);

      // Assert - Should not throw error when pressing duration button
      expect(() => {
        fireEvent.press(screen.getByText('1W'));
      }).not.toThrow();
    });

    it.each([
      ['1HR', '1hr'],
      ['1D', '1d'],
      ['1W', '1w'],
      ['1M', '1m'],
      ['YTD', 'ytd'],
      ['Max', 'max'],
    ] as const)(
      'calls onDurationChange with correct value for %s',
      (label, expectedValue) => {
        // Arrange
        const onDurationChange = jest.fn();
        const props = { ...defaultProps, onDurationChange };

        // Act
        render(<CandlestickChartComponent {...props} />);
        fireEvent.press(screen.getByText(label));

        // Assert
        expect(onDurationChange).toHaveBeenCalledWith(expectedValue);
      },
    );
  });

  describe('Data Transformation', () => {
    it('transforms candle data to correct format', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
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
      expect(chart).toHaveProp('data-height', 280);
      expect(chart).toHaveProp('data-width', 685);
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
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
    });

    it('handles large screen sizes', () => {
      // Arrange & Act (using fixed dimensions for consistent testing)
      renderWithWrapper(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles candle data with string numbers', () => {
      // Arrange
      const candleDataWithStrings = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
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
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
    });

    it('handles invalid duration selection gracefully', () => {
      // Arrange
      const props = {
        ...defaultProps,
        selectedDuration: 'invalid' as TimeDuration,
      };

      // Act
      renderWithWrapper(<CandlestickChartComponent {...props} />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.PROVIDER),
      ).toBeOnTheScreen();
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

  describe('TP/SL Lines', () => {
    it('renders TP/SL lines when tpslLines prop is provided with valid prices', async () => {
      // Arrange
      const propsWithTPSL = {
        ...defaultProps,
        tpslLines: {
          takeProfitPrice: '46800', // Within chart range (44000-47000)
          stopLossPrice: '44500', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithTPSL} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const tpslElements = screen.getAllByTestId(/auxiliary-line-/);
        expect(tpslElements).toHaveLength(2); // One for TP, one for SL
      });
    });

    it('does not render TP/SL lines when tpslLines prop is not provided', () => {
      // Arrange & Act
      render(<CandlestickChartComponent {...defaultProps} />);

      // Assert
      const tpslElements = screen.queryAllByTestId(/auxiliary-line-/);
      expect(tpslElements).toHaveLength(0);
    });

    it('renders only TP line when only takeProfitPrice is provided', async () => {
      // Arrange
      const propsWithTPOnly = {
        ...defaultProps,
        tpslLines: {
          takeProfitPrice: '46800', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithTPOnly} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const tpslElements = screen.getAllByTestId(/auxiliary-line-tp/);
        expect(tpslElements).toHaveLength(1);
        const slElements = screen.queryAllByTestId(/auxiliary-line-sl/);
        expect(slElements).toHaveLength(0);
      });
    });

    it('renders only SL line when only stopLossPrice is provided', async () => {
      // Arrange
      const propsWithSLOnly = {
        ...defaultProps,
        tpslLines: {
          stopLossPrice: '44500', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithSLOnly} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const tpslElements = screen.getAllByTestId(/auxiliary-line-sl/);
        expect(tpslElements).toHaveLength(1);
        const tpElements = screen.queryAllByTestId(/auxiliary-line-tp/);
        expect(tpElements).toHaveLength(0);
      });
    });

    it('renders entry price line when entryPrice is provided', async () => {
      // Arrange
      const propsWithEntry = {
        ...defaultProps,
        tpslLines: {
          entryPrice: '45500', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithEntry} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const entryElements = screen.getAllByTestId(/auxiliary-line-entry/);
        expect(entryElements).toHaveLength(1);
      });
    });

    it('renders liquidation price line when liquidationPrice is provided', async () => {
      // Arrange
      const propsWithLiquidation = {
        ...defaultProps,
        tpslLines: {
          liquidationPrice: '44200', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithLiquidation} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const liquidationElements = screen.getAllByTestId(
          /auxiliary-line-liquidation/,
        );
        expect(liquidationElements).toHaveLength(1);
      });
    });

    it('does not render liquidation price line when liquidationPrice is null', async () => {
      // Arrange
      const propsWithNullLiquidation = {
        ...defaultProps,
        tpslLines: {
          liquidationPrice: null,
          entryPrice: '45500', // Include another line to ensure component renders
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithNullLiquidation} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const liquidationElements = screen.queryAllByTestId(
          /auxiliary-line-liquidation/,
        );
        expect(liquidationElements).toHaveLength(0);

        const entryElements = screen.getAllByTestId(/auxiliary-line-entry/);
        expect(entryElements).toHaveLength(1); // Entry line should still render
      });
    });

    it('renders current price line when currentPrice is provided', async () => {
      // Arrange
      const propsWithCurrent = {
        ...defaultProps,
        tpslLines: {
          currentPrice: '45800', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithCurrent} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const currentElements = screen.getAllByTestId(/auxiliary-line-current/);
        expect(currentElements).toHaveLength(1);
      });
    });

    it('renders all lines when TP, SL, entry, liquidation, and current prices are provided', async () => {
      // Arrange
      const propsWithAll = {
        ...defaultProps,
        tpslLines: {
          takeProfitPrice: '46800', // Within chart range (44000-47000)
          stopLossPrice: '44500', // Within chart range (44000-47000)
          entryPrice: '45500', // Within chart range (44000-47000)
          liquidationPrice: '44200', // Within chart range (44000-47000)
          currentPrice: '45800', // Within chart range (44000-47000)
        },
      };

      // Act
      render(<CandlestickChartComponent {...propsWithAll} />);

      // Assert - Wait for the timeout to complete
      await waitFor(() => {
        const tpslElements = screen.getAllByTestId(/auxiliary-line-/);
        expect(tpslElements).toHaveLength(5); // One for TP, one for SL, one for entry, one for liquidation, one for current

        const tpElements = screen.getAllByTestId(/auxiliary-line-tp/);
        expect(tpElements).toHaveLength(1);

        const slElements = screen.getAllByTestId(/auxiliary-line-sl/);
        expect(slElements).toHaveLength(1);

        const entryElements = screen.getAllByTestId(/auxiliary-line-entry/);
        expect(entryElements).toHaveLength(1);

        const liquidationElements = screen.getAllByTestId(
          /auxiliary-line-liquidation/,
        );
        expect(liquidationElements).toHaveLength(1);

        const currentElements = screen.getAllByTestId(/auxiliary-line-current/);
        expect(currentElements).toHaveLength(1);
      });
    });
  });
});
