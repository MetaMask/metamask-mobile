import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsPositionDetailsView from './PerpsPositionDetailsView';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import type { Position } from '../../controllers/types';
import {
  PerpsPositionCardSelectorsIDs,
  PerpsPositionHeaderSelectorsIDs,
  PerpsPositionDetailsViewSelectorsIDs,
  PerpsCandlestickChartSelectorsIDs,
  getPerpsViewSelector,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/usePerpsPositionData', () => ({
  usePerpsPositionData: jest.fn(),
}));

jest.mock('../../hooks/usePerpsClosePosition', () => ({
  usePerpsClosePosition: jest.fn(() => ({
    handleClosePosition: jest.fn(),
    isClosing: false,
    error: null,
  })),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock PerpsTPSLBottomSheet to avoid PerpsConnectionProvider requirement
jest.mock('../../components/PerpsTPSLBottomSheet', () => ({
  __esModule: true,
  default: ({
    isVisible,
    onClose,
  }: {
    isVisible: boolean;
    onClose: () => void;
  }) => {
    if (!isVisible) return null;
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    const {
      PerpsPositionDetailsViewSelectorsIDs:
        PerpsPositionDetailsViewSelectorsIDsMock,
    } = jest.requireActual(
      '../../../../../../e2e/selectors/Perps/Perps.selectors',
    );
    return (
      <View testID={PerpsPositionDetailsViewSelectorsIDsMock.TPSL_BOTTOMSHEET}>
        <TouchableOpacity onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock PerpsClosePositionBottomSheet to avoid PerpsConnectionProvider requirement
jest.mock('../../components/PerpsClosePositionBottomSheet', () => ({
  __esModule: true,
  default: ({
    isVisible,
    onClose,
    onConfirm,
    position: _position,
  }: {
    isVisible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    position: Position;
  }) => {
    if (!isVisible) return null;
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    const {
      PerpsPositionDetailsViewSelectorsIDs:
        PerpsPositionDetailsViewSelectorsIDsMock,
    } = jest.requireActual(
      '../../../../../../e2e/selectors/Perps/Perps.selectors',
    );
    return (
      <View
        testID={
          PerpsPositionDetailsViewSelectorsIDsMock.CLOSE_POSITION_BOTTOMSHEET
        }
      >
        <TouchableOpacity onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          testID={
            PerpsPositionDetailsViewSelectorsIDsMock.CONFIRM_CLOSE_POSITION
          }
        >
          <Text>Confirm</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock the wagmi charts library to fix missing getDomain function
jest.mock('react-native-wagmi-charts', () => {
  const { View } = jest.requireActual('react-native');
  const {
    PerpsPositionDetailsViewSelectorsIDs:
      PerpsPositionDetailsViewSelectorsIDsMock,
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
      testID={PerpsPositionDetailsViewSelectorsIDsMock.CANDLESTICK_CHART}
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
      testID={PerpsPositionDetailsViewSelectorsIDsMock.CHART_PROVIDER}
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
      testID={PerpsPositionDetailsViewSelectorsIDsMock.CHART_CANDLES}
      data-positive-color={positiveColor}
      data-negative-color={negativeColor}
    />
  );

  MockChart.Crosshair = ({ children }: { children: React.ReactNode }) => (
    <View testID={PerpsPositionDetailsViewSelectorsIDsMock.CHART_CROSSHAIR}>
      {children}
    </View>
  );

  MockChart.Tooltip = ({
    children,
    style,
    tooltipTextProps,
  }: {
    children?: React.ReactNode;
    style?: unknown;
    tooltipTextProps?: unknown;
  }) => (
    <View
      testID={PerpsPositionDetailsViewSelectorsIDsMock.CHART_TOOLTIP}
      data-style={style}
      data-text-props={tooltipTextProps}
    >
      {children}
    </View>
  );

  return {
    CandlestickChart: MockChart,
  };
});

// Test data
const mockPosition: Position = {
  coin: 'ETH',
  size: '2.5',
  entryPrice: '2000.00',
  positionValue: '5000.00',
  unrealizedPnl: '250.00',
  marginUsed: '500.00',
  leverage: {
    type: 'isolated',
    value: 10,
  },
  liquidationPrice: '1800.00',
  maxLeverage: 20,
  returnOnEquity: '12.5',
  cumulativeFunding: {
    allTime: '10.00',
    sinceOpen: '5.00',
    sinceChange: '2.00',
  },
};

const mockCandleData = {
  coin: 'ETH',
  interval: '1h',
  candles: [
    {
      time: 1640995200000,
      open: '1990.00',
      high: '2010.00',
      low: '1980.00',
      close: '2005.00',
      volume: '1000.00',
    },
  ],
};

const mockPriceData = {
  coin: 'ETH',
  price: '2000.00',
  change24h: '1.5',
  volume24h: '1000000',
};

describe('PerpsPositionDetailsView', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  const mockRoute = {
    params: {
      position: mockPosition,
    },
  };

  const mockPerpsPositionData = {
    candleData: mockCandleData,
    priceData: mockPriceData,
    isLoadingHistory: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    (usePerpsPositionData as jest.Mock).mockReturnValue(mockPerpsPositionData);
    // Using real useStyles hook implementation
  });

  describe('Component Rendering', () => {
    it('renders all main sections when position is provided', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen(); // Position header
      expect(
        screen.getByTestId(
          PerpsPositionDetailsViewSelectorsIDs.CANDLESTICK_CHART,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Position')).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
    });

    it('displays position header with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('ETH-USD')).toBeOnTheScreen();
      expect(screen.getAllByText('$2,000.00')[0]).toBeOnTheScreen(); // First occurrence is in header
    });

    it('displays position card with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText(/2\.50[\s\S]*ETH/)).toBeOnTheScreen(); // Position size and coin
      expect(screen.getByText(/10[\s\S]*x/)).toBeOnTheScreen(); // Leverage (10 and x may be separate text nodes)
      expect(screen.getByText('long')).toBeOnTheScreen(); // Position direction
      expect(screen.getByText('$5,000.00')).toBeOnTheScreen(); // Position value
    });

    it('displays chart with correct initial state', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getPerpsViewSelector.chartDurationButton('1d')),
      ).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when position is not provided', () => {
      // Arrange
      const mockRouteWithoutPosition = {
        params: {},
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithoutPosition);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(
          'Position data not found. Please go back and try again.',
        ),
      ).toBeOnTheScreen();
    });

    it('displays error message when position is null', () => {
      // Arrange
      const mockRouteWithNullPosition = {
        params: {
          position: null,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithNullPosition);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(
          'Position data not found. Please go back and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed via header', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(
        screen.getByTestId(PerpsPositionHeaderSelectorsIDs.BACK_BUTTON),
      );

      // Assert
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chart Integration', () => {
    it('displays chart with loading state when data is loading', () => {
      // Arrange
      (usePerpsPositionData as jest.Mock).mockReturnValue({
        ...mockPerpsPositionData,
        isLoadingHistory: true,
      });

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByTestId(
          PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR_LOADING,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.LOADING_SKELETON),
      ).toBeOnTheScreen();
    });

    it('displays chart with no data state when candle data is null', () => {
      // Arrange
      (usePerpsPositionData as jest.Mock).mockReturnValue({
        ...mockPerpsPositionData,
        candleData: null,
      });

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByTestId(
          PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR_NO_DATA,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('No chart data available')).toBeOnTheScreen();
    });

    it('handles duration change correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(
        screen.getByTestId(getPerpsViewSelector.chartDurationButton('1w')),
      );

      // Assert
      // The component should re-render with new duration, but we can't easily test state changes
      // This test ensures the duration change handler doesn't crash
      expect(
        screen.getByTestId(PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR),
      ).toBeOnTheScreen();
    });
  });

  describe('Position Actions', () => {
    it('handles close position action', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert
      // Since handleClosePosition just logs, we can't assert much here
      // But we can ensure the component doesn't crash
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
    });

    it('handles edit TP/SL action', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Bottom sheet should not be visible initially
      expect(
        screen.queryByTestId(
          PerpsPositionDetailsViewSelectorsIDs.TPSL_BOTTOMSHEET,
        ),
      ).toBeNull();

      // Press edit button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert - Bottom sheet should be visible
      expect(
        screen.getByTestId(
          PerpsPositionDetailsViewSelectorsIDs.TPSL_BOTTOMSHEET,
        ),
      ).toBeDefined();

      // Component should still be on screen
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
    });
  });

  describe('usePerpsPositionData Integration', () => {
    it('calls usePerpsPositionData hook with correct parameters', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(usePerpsPositionData).toHaveBeenCalledWith({
        coin: 'ETH',
        selectedDuration: '1d',
        selectedInterval: '1h',
      });
    });

    it('handles different coin types', () => {
      // Arrange
      const btcPosition = {
        ...mockPosition,
        coin: 'BTC',
      };
      const mockBtcRoute = {
        params: { position: btcPosition },
      };
      (useRoute as jest.Mock).mockReturnValue(mockBtcRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(usePerpsPositionData).toHaveBeenCalledWith({
        coin: 'BTC',
        selectedDuration: '1d',
        selectedInterval: '1h',
      });
      expect(screen.getByText('BTC-USD')).toBeOnTheScreen();
    });
  });

  describe('Route Parameters', () => {
    it('handles route action parameter', () => {
      // Arrange
      const mockRouteWithAction = {
        params: {
          position: mockPosition,
          action: 'close',
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithAction);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD),
      ).toBeOnTheScreen();
    });

    it('handles missing route params gracefully', () => {
      // Arrange
      const mockEmptyRoute = {};
      (useRoute as jest.Mock).mockReturnValue(mockEmptyRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(
          'Position data not found. Please go back and try again.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
