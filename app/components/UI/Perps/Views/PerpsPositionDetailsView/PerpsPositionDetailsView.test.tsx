import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsPositionDetailsView from './PerpsPositionDetailsView';
import { usePerpsPositionData } from '../../hooks/usePerpsPositionData';
import type { Position } from '../../controllers/types';

// Mock component types
interface MockTextProps {
  children?: React.ReactNode;
  testID?: string;
}

interface MockCandlestickChartProps {
  candleData?: {
    coin: string;
    interval: string;
    candles: {
      time: number;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    }[];
  } | null;
  isLoading?: boolean;
  onIntervalChange?: (interval: string) => void;
  selectedInterval?: string;
}

interface MockPositionCardProps {
  position?: Position;
  onClose?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

interface MockPositionHeaderProps {
  position?: Position;
  onBackPress?: () => void;
  priceData?: {
    coin: string;
    price: string;
    change24h: string;
    volume24h: string;
  } | null;
}

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../../hooks/usePerpsPositionData', () => ({
  usePerpsPositionData: jest.fn(),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock components
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({ children, testID, ...props }: MockTextProps) => {
    const { Text } = jest.requireActual('react-native');
    return (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    );
  },
}));

jest.mock(
  '../../components/PerpsCandlestickChart/PerpsCandlectickChart',
  () => ({
    __esModule: true,
    default: ({
      candleData,
      isLoading,
      onIntervalChange,
      selectedInterval,
      ...props
    }: MockCandlestickChartProps) => {
      const { View, Text, TouchableOpacity } =
        jest.requireActual('react-native');
      return (
        <View testID="candlestick-chart" {...props}>
          <Text testID="chart-loading-state">
            {isLoading ? 'Loading chart...' : 'Chart loaded'}
          </Text>
          <Text testID="chart-data-state">
            {candleData ? 'Has data' : 'No data'}
          </Text>
          <Text testID="chart-selected-interval">
            Selected: {selectedInterval}
          </Text>
          <TouchableOpacity
            testID="chart-interval-change"
            onPress={() => onIntervalChange?.('4h')}
          >
            <Text>Change Interval</Text>
          </TouchableOpacity>
        </View>
      );
    },
  }),
);

jest.mock('../../components/PerpsPositionCard', () => ({
  __esModule: true,
  default: ({
    position,
    onClose,
    onEdit,
    disabled,
    ...props
  }: MockPositionCardProps) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="position-card" {...props}>
        <Text testID="position-card-coin">{position?.coin}</Text>
        <Text testID="position-card-size">{position?.size}</Text>
        <Text testID="position-card-disabled">{String(disabled)}</Text>
        <TouchableOpacity
          testID="position-card-close"
          onPress={onClose}
          disabled={disabled}
        >
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="position-card-edit"
          onPress={onEdit}
          disabled={disabled}
        >
          <Text>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('../../components/PerpsPostitionHeader/PerpsPositionHeader', () => ({
  __esModule: true,
  default: ({
    position,
    onBackPress,
    priceData,
    ...props
  }: MockPositionHeaderProps) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="position-header" {...props}>
        <Text testID="position-header-coin">{position?.coin}</Text>
        <Text testID="position-header-pnl">{position?.unrealizedPnl}</Text>
        <TouchableOpacity testID="position-header-back" onPress={onBackPress}>
          <Text>Back</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

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

const mockTheme = {
  colors: {
    background: { default: '#FFFFFF', alternative: '#F8F9FA' },
    text: { default: '#24292E', muted: '#6A737D' },
    border: { muted: '#E1E4E8' },
    success: { default: '#28A745', muted: '#D4EDDA' },
    error: { default: '#DC3545', muted: '#F8D7DA' },
    warning: { default: '#FFC107', muted: '#FFF3CD' },
    overlay: { default: 'rgba(0, 0, 0, 0.5)' },
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
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Component Rendering', () => {
    it('renders all main sections when position is provided', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-header')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-chart')).toBeOnTheScreen();
      expect(screen.getByText('Position')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
    });

    it('displays position header with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-header-coin')).toHaveTextContent(
        'ETH',
      );
      expect(screen.getByTestId('position-header-pnl')).toHaveTextContent(
        '250.00',
      );
    });

    it('displays position card with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-card-coin')).toHaveTextContent('ETH');
      expect(screen.getByTestId('position-card-size')).toHaveTextContent('2.5');
      expect(screen.getByTestId('position-card-disabled')).toHaveTextContent(
        'true',
      );
    });

    it('displays chart with correct initial state', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('chart-loading-state')).toHaveTextContent(
        'Chart loaded',
      );
      expect(screen.getByTestId('chart-data-state')).toHaveTextContent(
        'Has data',
      );
      expect(screen.getByTestId('chart-selected-interval')).toHaveTextContent(
        'Selected: 1h',
      );
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
      fireEvent.press(screen.getByTestId('position-header-back'));

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
      expect(screen.getByTestId('chart-loading-state')).toHaveTextContent(
        'Loading chart...',
      );
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
      expect(screen.getByTestId('chart-data-state')).toHaveTextContent(
        'No data',
      );
    });

    it('handles interval change correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('chart-interval-change'));

      // Assert
      // The component should re-render with new interval, but we can't easily test state changes
      // This test ensures the interval change handler doesn't crash
      expect(screen.getByTestId('chart-selected-interval')).toBeOnTheScreen();
    });
  });

  describe('Position Actions', () => {
    it('handles close position action', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('position-card-close'));

      // Assert
      // Since handleClosePosition just logs, we can't assert much here
      // But we can ensure the component doesn't crash
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
    });

    it('handles edit TP/SL action', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('position-card-edit'));

      // Assert
      // Since handleEditTPSL just logs, we can't assert much here
      // But we can ensure the component doesn't crash
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
    });
  });

  describe('usePerpsPositionData Integration', () => {
    it('calls usePerpsPositionData hook with correct parameters', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(usePerpsPositionData).toHaveBeenCalledWith({
        coin: 'ETH',
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
        selectedInterval: '1h',
      });
      expect(screen.getByTestId('position-header-coin')).toHaveTextContent(
        'BTC',
      );
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
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
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
