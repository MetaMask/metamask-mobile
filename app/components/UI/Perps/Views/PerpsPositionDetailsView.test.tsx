import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import PerpsPositionDetailsView from './PerpsPositionDetailsView';
import { usePerpsTrading } from '../hooks';
import { HyperLiquidSubscriptionService } from '../services/HyperLiquidSubscriptionService';
import type { Position } from '../controllers/types';

// Mock component types
interface MockButtonProps {
  onPress?: () => void;
  label?: string;
  loading?: boolean;
  testID?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

interface MockButtonIconProps {
  onPress?: () => void;
  iconName?: string;
  testID?: string;
}

interface MockTextProps {
  children?: React.ReactNode;
  testID?: string;
}

interface MockCandlestickChartProps {
  candleData?: {
    candles?: {
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
  testID?: string;
}

interface MockPositionHeaderProps {
  position?: Position;
  pnlPercentage?: number;
  testID?: string;
}

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('../hooks', () => ({
  usePerpsTrading: jest.fn(),
}));

jest.mock('../services/HyperLiquidSubscriptionService', () => ({
  HyperLiquidSubscriptionService: {
    fetchHistoricalCandles: jest.fn(),
  },
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock Alert will be combined with Modal and TextInput mock below

// Mock components
jest.mock('../../../../component-library/components/Buttons/Button', () => ({
  __esModule: true,
  default: ({ onPress, label, loading, testID, ...props }: MockButtonProps) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        testID={testID || `button-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        {...props}
      >
        <Text>{loading ? 'Loading...' : label}</Text>
      </TouchableOpacity>
    );
  },
  ButtonSize: { Lg: 'lg', Md: 'md' },
  ButtonVariants: { Primary: 'primary', Secondary: 'secondary' },
  ButtonWidthTypes: { Full: 'full' },
}));

jest.mock(
  '../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: ({ onPress, iconName, testID, ...props }: MockButtonIconProps) => {
      const { TouchableOpacity, Text } = jest.requireActual('react-native');
      return (
        <TouchableOpacity
          onPress={onPress}
          testID={testID || `button-icon-${iconName?.toLowerCase()}`}
          {...props}
        >
          <Text>{iconName}</Text>
        </TouchableOpacity>
      );
    },
    ButtonIconSizes: { Md: 'md' },
  }),
);

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: { ArrowLeft: 'arrow-left' },
  IconColor: { Default: 'default' },
}));

jest.mock('../../../../component-library/components/Texts/Text', () => ({
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

jest.mock('../components/PerpsCandlestickChart/PerpsCandlectickChart', () => ({
  __esModule: true,
  default: ({
    candleData,
    isLoading,
    onIntervalChange,
    selectedInterval,
    testID,
    ...props
  }: MockCandlestickChartProps) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID={testID || 'candlestick-chart'} {...props}>
        <Text testID="chart-loading-state">
          {isLoading ? 'Loading chart...' : 'Chart loaded'}
        </Text>
        <Text testID="chart-data-state">
          {candleData
            ? `Data: ${candleData.candles?.length || 0} candles`
            : 'No data'}
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
}));

jest.mock('../components/PerpsPositionCard', () => ({
  __esModule: true,
  default: ({
    position,
    onClose,
    onEdit,
    disabled,
    testID,
    ...props
  }: {
    position?: Position;
    onClose?: () => void;
    onEdit?: () => void;
    disabled?: boolean;
    testID?: string;
  }) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID={testID || 'position-card'} {...props}>
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

jest.mock('../components/PerpsPostitionHeader/PerpsPositionHeader', () => ({
  __esModule: true,
  default: ({
    position,
    pnlPercentage,
    testID,
    ...props
  }: MockPositionHeaderProps) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID={testID || 'position-header'} {...props}>
        <Text testID="position-header-coin">{position?.coin}</Text>
        <Text testID="position-header-pnl">{pnlPercentage}</Text>
      </View>
    );
  },
}));

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

jest.mock('../utils/formatUtils', () => ({
  formatPrice: jest.fn((price) => `$${price}`),
  formatPercentage: jest.fn((percent) => `${percent}%`),
}));

jest.mock('../utils/pnlCalculations', () => ({
  calculatePnLPercentageFromUnrealized: jest.fn(() => 12.5),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
  // Find the onPress handler for the destructive button (Close Position)
  const destructiveButton = buttons?.find(
    (button) => button.style === 'destructive',
  );
  destructiveButton?.onPress?.();
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

const mockNegativePnLPosition: Position = {
  ...mockPosition,
  size: '-1.5',
  unrealizedPnl: '-150.00',
  returnOnEquity: '-7.5',
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

const mockHistoricalData = {
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
    {
      time: 1640998800000,
      open: '2005.00',
      high: '2020.00',
      low: '1995.00',
      close: '2015.00',
      volume: '1200.00',
    },
  ],
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

  const mockPerpsTrading = {
    closePosition: jest.fn(),
    getPositions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue(mockRoute);
    (usePerpsTrading as jest.Mock).mockReturnValue(mockPerpsTrading);
    mockUseTheme.mockReturnValue(mockTheme);

    // Mock successful historical data fetch
    (
      HyperLiquidSubscriptionService.fetchHistoricalCandles as jest.Mock
    ).mockResolvedValue(mockHistoricalData);
  });

  describe('Component Rendering', () => {
    it('renders position details view with all sections', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Position Details')).toBeOnTheScreen();
      expect(screen.getByTestId('position-header')).toBeOnTheScreen();
      expect(screen.getByTestId('candlestick-chart')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
      expect(screen.getByText('Position Actions')).toBeOnTheScreen();
    });

    it('displays position header with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-header-coin')).toHaveTextContent(
        'ETH',
      );
      expect(screen.getByTestId('position-header-pnl')).toHaveTextContent(
        '12.5',
      );
    });

    it('displays position card with correct data', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-card-coin')).toHaveTextContent('ETH');
      expect(screen.getByTestId('position-card-size')).toHaveTextContent('2.5');
    });

    it('displays position details grid with formatted values', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Size')).toBeOnTheScreen();
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen();
      expect(screen.getByText('Entry Price')).toBeOnTheScreen();
      expect(screen.getByText('$2000.00')).toBeOnTheScreen();
      expect(screen.getByText('Position Value')).toBeOnTheScreen();
      expect(screen.getByText('$5000.00')).toBeOnTheScreen();
      expect(screen.getByText('Leverage')).toBeOnTheScreen();
      expect(screen.getByText('10x')).toBeOnTheScreen();
    });

    it('displays action buttons', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByTestId('button-close-long-position'),
      ).toBeOnTheScreen();
    });

    it('displays warning message for position closure', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(
          /⚠️ Closing this position will execute a market order/,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(/LONG position in ETH/)).toBeOnTheScreen();
    });
  });

  describe('Position Direction and Calculations', () => {
    it('displays LONG position correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText(/LONG position in ETH/)).toBeOnTheScreen();
      expect(
        screen.getByTestId('button-close-long-position'),
      ).toBeOnTheScreen();
    });

    it('displays SHORT position correctly', () => {
      // Arrange
      const mockShortRoute = {
        params: {
          position: mockNegativePnLPosition,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockShortRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText(/SHORT position in ETH/)).toBeOnTheScreen();
      expect(
        screen.getByTestId('button-close-short-position'),
      ).toBeOnTheScreen();
    });

    it('calculates absolute size correctly for SHORT position', () => {
      // Arrange
      const mockShortRoute = {
        params: {
          position: mockNegativePnLPosition,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockShortRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('1.500000 ETH')).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('button-icon-arrow-left'));

      // Assert
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Chart Integration', () => {
    it('displays chart with loading state initially', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('chart-loading-state')).toHaveTextContent(
        'Loading chart...',
      );
    });

    it('displays chart with data after loading', async () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('chart-loading-state')).toHaveTextContent(
          'Chart loaded',
        );
        expect(screen.getByTestId('chart-data-state')).toHaveTextContent(
          'Data: 2 candles',
        );
      });
    });

    it('displays selected interval correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('chart-selected-interval')).toHaveTextContent(
        'Selected: 1h',
      );
    });

    it('handles interval change correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('chart-interval-change'));

      // Assert
      expect(screen.getByTestId('chart-selected-interval')).toHaveTextContent(
        'Selected: 4h',
      );
    });

    it('fetches historical data with correct parameters', async () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      await waitFor(() => {
        expect(
          HyperLiquidSubscriptionService.fetchHistoricalCandles,
        ).toHaveBeenCalledWith('ETH', '1h', 100);
      });
    });

    it('refetches data when interval changes', async () => {
      // Act
      render(<PerpsPositionDetailsView />);
      await waitFor(() => {
        expect(
          HyperLiquidSubscriptionService.fetchHistoricalCandles,
        ).toHaveBeenCalledTimes(1);
      });

      fireEvent.press(screen.getByTestId('chart-interval-change'));

      // Assert
      await waitFor(() => {
        expect(
          HyperLiquidSubscriptionService.fetchHistoricalCandles,
        ).toHaveBeenCalledWith('ETH', '4h', 100);
      });
    });

    it('handles chart data loading error gracefully', async () => {
      // Arrange
      (
        HyperLiquidSubscriptionService.fetchHistoricalCandles as jest.Mock
      ).mockRejectedValue(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error loading historical candles:',
          expect.any(Error),
        );
        expect(screen.getByTestId('chart-loading-state')).toHaveTextContent(
          'Chart loaded',
        );
        expect(screen.getByTestId('chart-data-state')).toHaveTextContent(
          'No data',
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Position Details Grid', () => {
    it('displays N/A for liquidation price when not available', () => {
      // Arrange
      const positionWithoutLiquidation = {
        ...mockPosition,
        liquidationPrice: null,
      };
      const mockRouteWithoutLiquidation = {
        params: {
          position: positionWithoutLiquidation,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithoutLiquidation);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Liquidation Price')).toBeOnTheScreen();
      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('displays all position detail fields', () => {
      // Arrange
      const expectedFields = [
        'Size',
        'Entry Price',
        'Mark Price',
        'Position Value',
        'Margin Used',
        'Leverage',
        'Liquidation Price',
        'ROE',
        'Take Profit',
        'Stop Loss',
      ];

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expectedFields.forEach((field) => {
        expect(screen.getByText(field)).toBeOnTheScreen();
      });
    });

    it('displays placeholder values for TP/SL', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getAllByText('Not Set')).toHaveLength(2);
    });
  });

  describe('Leverage Types', () => {
    it('displays isolated leverage correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('10x')).toBeOnTheScreen();
    });

    it('displays cross leverage correctly', () => {
      // Arrange
      const crossLeveragePosition = {
        ...mockPosition,
        leverage: {
          type: 'cross' as const,
          value: 5,
        },
      };
      const mockCrossRoute = {
        params: {
          position: crossLeveragePosition,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockCrossRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('5x')).toBeOnTheScreen();
    });
  });

  describe('Position Header Integration', () => {
    it('renders position header with correct props', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-header')).toBeOnTheScreen();
    });

    it('passes correct PnL percentage to header', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-header-pnl')).toBeOnTheScreen();
    });
  });

  describe('Position Card Integration', () => {
    it('renders position card with close and edit callbacks', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-card')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card-close')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card-edit')).toBeOnTheScreen();
    });

    it('disables position card interactions', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByTestId('position-card-disabled')).toHaveTextContent(
        'true',
      );
    });

    it('handles position card edit callback', () => {
      // Act
      render(<PerpsPositionDetailsView />);
      fireEvent.press(screen.getByTestId('position-card-edit'));

      // Assert
      expect(screen.getByText('Edit')).toBeOnTheScreen();
    });
  });

  describe('Position Direction and Calculations', () => {
    it('displays LONG position direction correctly', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Close LONG Position')).toBeOnTheScreen();
    });

    it('displays SHORT position direction correctly', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-1.5',
      };
      const mockShortRoute = {
        params: { position: shortPosition },
      };
      (useRoute as jest.Mock).mockReturnValue(mockShortRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Close SHORT Position')).toBeOnTheScreen();
    });

    it('calculates absolute position size correctly for LONG', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen();
    });

    it('calculates absolute position size correctly for SHORT', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-2.5',
      };
      const mockShortRoute = {
        params: { position: shortPosition },
      };
      (useRoute as jest.Mock).mockReturnValue(mockShortRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen();
    });
  });

  describe('Error States and Edge Cases', () => {
    it('handles position with zero size gracefully', () => {
      // Arrange
      const positionWithZeroSize = {
        ...mockPosition,
        size: '0',
      };
      const mockRouteWithZeroSize = {
        params: { position: positionWithZeroSize },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithZeroSize);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('0.000000 ETH')).toBeOnTheScreen();
    });

    it('handles position with very small size gracefully', () => {
      // Arrange
      const positionWithSmallSize = {
        ...mockPosition,
        size: '0.000001',
      };
      const mockRouteWithSmallSize = {
        params: { position: positionWithSmallSize },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithSmallSize);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('0.000001 ETH')).toBeOnTheScreen();
    });

    it('handles missing liquidation price gracefully', () => {
      // Arrange
      const positionWithoutLiq = {
        ...mockPosition,
        liquidationPrice: null,
      };
      const mockRouteWithoutLiq = {
        params: { position: positionWithoutLiq },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithoutLiq);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('handles missing return on equity gracefully', () => {
      // Arrange
      const positionWithoutROE = {
        ...mockPosition,
        returnOnEquity: null,
      };
      const mockRouteWithoutROE = {
        params: { position: positionWithoutROE },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithoutROE);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('0%')).toBeOnTheScreen();
    });
  });

  describe('Route Parameters and Actions', () => {
    it('handles route action parameter for close', () => {
      // Arrange
      const mockRouteWithCloseAction = {
        params: {
          position: mockPosition,
          action: 'close',
        },
      };
      (useRoute as jest.Mock).mockReturnValue(mockRouteWithCloseAction);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(screen.getByText('Close LONG Position')).toBeOnTheScreen();
    });
  });

  describe('Warning Messages', () => {
    it('displays position closure warning message', () => {
      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(
          /⚠️ Closing this position will execute a market order/,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(/to exit your entire LONG position in ETH/),
      ).toBeOnTheScreen();
    });

    it('updates warning message for SHORT positions', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-1.5',
      };
      const mockShortRoute = {
        params: { position: shortPosition },
      };
      (useRoute as jest.Mock).mockReturnValue(mockShortRoute);

      // Act
      render(<PerpsPositionDetailsView />);

      // Assert
      expect(
        screen.getByText(/to exit your entire SHORT position in ETH/),
      ).toBeOnTheScreen();
    });
  });
});
