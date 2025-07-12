import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsPositionCard from './PerpsPositionCard';
import type { Position } from '../../controllers/types';

// Mock component types
interface MockButtonIconProps {
  iconName?: string;
  iconColor?: string;
  size?: string;
  onPress?: () => void;
  testID?: string;
}

interface MockTextProps {
  children?: React.ReactNode;
  style?: unknown;
  testID?: string;
}

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock components
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    __esModule: true,
    default: ({
      iconName,
      iconColor,
      size,
      onPress,
      testID,
      ...props
    }: MockButtonIconProps) => {
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
    ButtonIconSizes: { Sm: 'small', Md: 'medium' },
  }),
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  IconName: { Edit: 'edit', Close: 'close' },
  IconColor: { Muted: 'muted', Error: 'error' },
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({ children, style, testID, ...props }: MockTextProps) => {
    const { Text } = jest.requireActual('react-native');
    return (
      <Text style={style} testID={testID} {...props}>
        {children}
      </Text>
    );
  },
}));

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPrice: (value: string) => `$${parseFloat(value).toFixed(2)}`,
  formatPnl: (value: number) => `$${value.toFixed(2)}`,
  formatPercentage: (value: number) => `${value.toFixed(2)}%`,
  formatPositionSize: (size: string) => Math.abs(parseFloat(size)).toFixed(6),
}));

// Mock PnL calculations
jest.mock('../../utils/pnlCalculations', () => ({
  calculatePnLPercentageFromUnrealized: jest.fn(),
}));

// Mock styles
jest.mock('./PerpsPositionCard.styles', () => ({
  createStyles: () => ({
    container: { padding: 10 },
    header: { flexDirection: 'row' },
    assetInfo: { flex: 1 },
    assetName: { fontSize: 18 },
    directionBadge: { padding: 4 },
    longBadge: { backgroundColor: 'green' },
    shortBadge: { backgroundColor: 'red' },
    directionText: { fontSize: 12 },
    longText: { color: 'green' },
    shortText: { color: 'red' },
    actionsContainer: { flexDirection: 'row' },
    detailsContainer: { flexDirection: 'row' },
    detailColumn: { flex: 1 },
    detailLabel: { fontSize: 12 },
    detailValue: { fontSize: 14 },
    pnlValue: { fontSize: 14 },
    positivePnl: { color: 'green' },
    negativePnl: { color: 'red' },
    leverageContainer: { marginTop: 10 },
    leverageInfo: { flexDirection: 'row' },
    leverageItem: { flex: 1 },
    leverageLabel: { fontSize: 12 },
    leverageValue: { fontSize: 14 },
  }),
}));

// Test data
const mockPosition: Position = {
  coin: 'ETH',
  size: '2.5',
  entryPrice: '2000.00',
  liquidationPrice: '1800.00',
  unrealizedPnl: '250.00',
  positionValue: '5000.00',
  marginUsed: '500.00',
  leverage: { type: 'isolated', value: 10 },
  maxLeverage: 100,
  returnOnEquity: '12.5',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
};

const mockNegativePnLPosition: Position = {
  coin: 'BTC',
  size: '-1.5',
  entryPrice: '45000.00',
  liquidationPrice: '50000.00',
  unrealizedPnl: '-675.00',
  positionValue: '67500.00',
  marginUsed: '6750.00',
  leverage: { type: 'cross', value: 10 },
  maxLeverage: 125,
  returnOnEquity: '-5.0',
  cumulativeFunding: {
    allTime: '15.2',
    sinceOpen: '8.7',
    sinceChange: '2.1',
  },
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
};

const mockTheme = {
  colors: {
    background: { default: '#ffffff' },
    text: { default: '#000000', muted: '#666666' },
    primary: { default: '#007AFF' },
    error: { default: '#FF3B30' },
    success: { default: '#34C759' },
  },
};

// Mock PnL calculation
const mockCalculatePnLPercentageFromUnrealized = jest.fn();

describe('PerpsPositionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    mockUseTheme.mockReturnValue(mockTheme);
    mockCalculatePnLPercentageFromUnrealized.mockReturnValue(12.5);

    // Mock the PnL calculation
    const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
      '../../utils/pnlCalculations',
    );
    calculatePnLPercentageFromUnrealized.mockReturnValue(12.5);
  });

  describe('Component Rendering', () => {
    it('renders position card with all elements', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('Size')).toBeOnTheScreen();
      expect(screen.getByText('Entry Price')).toBeOnTheScreen();
      expect(screen.getByText('Mark Price')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('P&L %')).toBeOnTheScreen();
      expect(screen.getByText('Position Value')).toBeOnTheScreen();
      expect(screen.getByText('Leverage')).toBeOnTheScreen();
      expect(screen.getByText('Margin Used')).toBeOnTheScreen();
      expect(screen.getByText('Liq. Price')).toBeOnTheScreen();
    });

    it('displays formatted position values correctly', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen();
      expect(screen.getByText('$2000.00')).toBeOnTheScreen();
      expect(screen.getByText('$250.00')).toBeOnTheScreen();
      expect(screen.getByText('12.50%')).toBeOnTheScreen();
      expect(screen.getByText('$5000.00')).toBeOnTheScreen();
      expect(screen.getByText('10x')).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
    });

    it('displays action buttons', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('edit')).toBeOnTheScreen();
      expect(screen.getByText('close')).toBeOnTheScreen();
    });
  });

  describe('Position Direction', () => {
    it('displays LONG position correctly', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('long')).toBeOnTheScreen();
    });

    it('displays SHORT position correctly', () => {
      // Act
      render(<PerpsPositionCard position={mockNegativePnLPosition} />);

      // Assert
      expect(screen.getByText('short')).toBeOnTheScreen();
    });

    it('formats position size correctly for SHORT position', () => {
      // Act
      render(<PerpsPositionCard position={mockNegativePnLPosition} />);

      // Assert
      expect(screen.getByText('1.500000 BTC')).toBeOnTheScreen();
    });
  });

  describe('P&L Calculations', () => {
    it('calculates and displays P&L percentage correctly', () => {
      // Arrange
      const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
        '../../utils/pnlCalculations',
      );
      calculatePnLPercentageFromUnrealized.mockReturnValue(15.75);

      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(calculatePnLPercentageFromUnrealized).toHaveBeenCalledWith({
        unrealizedPnl: 250,
        entryPrice: 2000,
        size: 2.5,
      });
      expect(screen.getByText('15.75%')).toBeOnTheScreen();
    });

    it('handles negative P&L correctly', () => {
      // Arrange
      const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
        '../../utils/pnlCalculations',
      );
      calculatePnLPercentageFromUnrealized.mockReturnValue(-5.0);

      // Act
      render(<PerpsPositionCard position={mockNegativePnLPosition} />);

      // Assert
      expect(screen.getByText('$-675.00')).toBeOnTheScreen();
      expect(screen.getByText('-5.00%')).toBeOnTheScreen();
    });

    it('handles zero P&L correctly', () => {
      // Arrange
      const zeroPosition = {
        ...mockPosition,
        unrealizedPnl: '0.00',
      };
      const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
        '../../utils/pnlCalculations',
      );
      calculatePnLPercentageFromUnrealized.mockReturnValue(0);

      // Act
      render(<PerpsPositionCard position={zeroPosition} />);

      // Assert
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
      expect(screen.getByText('0.00%')).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates to position details when card is pressed', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(screen.getByText('ETH'));

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'PerpsPositionDetails',
        {
          position: mockPosition,
          action: 'view',
        },
      );
    });

    it('navigates to position details with close action when close button is pressed', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(screen.getByText('close'), {
        stopPropagation: jest.fn(),
      });

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'PerpsPositionDetails',
        {
          position: mockPosition,
          action: 'close',
        },
      );
    });

    it('navigates to position details with edit action when edit button is pressed', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(screen.getByText('edit'), { stopPropagation: jest.fn() });

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'PerpsPositionDetails',
        {
          position: mockPosition,
          action: 'edit',
        },
      );
    });
  });

  describe('Action Callbacks', () => {
    it('calls onClose callback when close button is pressed', () => {
      // Arrange
      const mockOnClose = jest.fn();

      // Act
      render(
        <PerpsPositionCard position={mockPosition} onClose={mockOnClose} />,
      );
      fireEvent.press(screen.getByText('close'), {
        stopPropagation: jest.fn(),
      });

      // Assert
      expect(mockOnClose).toHaveBeenCalledWith(mockPosition);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('calls onEdit callback when edit button is pressed', () => {
      // Arrange
      const mockOnEdit = jest.fn();

      // Act
      render(<PerpsPositionCard position={mockPosition} onEdit={mockOnEdit} />);
      fireEvent.press(screen.getByText('edit'), { stopPropagation: jest.fn() });

      // Assert
      expect(mockOnEdit).toHaveBeenCalledWith(mockPosition);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('calls both onClose and onEdit callbacks when provided', () => {
      // Arrange
      const mockOnClose = jest.fn();
      const mockOnEdit = jest.fn();

      // Act
      render(
        <PerpsPositionCard
          position={mockPosition}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />,
      );
      fireEvent.press(screen.getByText('close'), {
        stopPropagation: jest.fn(),
      });
      fireEvent.press(screen.getByText('edit'), { stopPropagation: jest.fn() });

      // Assert
      expect(mockOnClose).toHaveBeenCalledWith(mockPosition);
      expect(mockOnEdit).toHaveBeenCalledWith(mockPosition);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('still allows action buttons to work when card is disabled', () => {
      // Arrange
      const mockOnClose = jest.fn();
      const mockOnEdit = jest.fn();

      // Act
      render(
        <PerpsPositionCard
          position={mockPosition}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          disabled
        />,
      );
      fireEvent.press(screen.getByText('close'), {
        stopPropagation: jest.fn(),
      });
      fireEvent.press(screen.getByText('edit'), { stopPropagation: jest.fn() });

      // Assert
      expect(mockOnClose).toHaveBeenCalledWith(mockPosition);
      expect(mockOnEdit).toHaveBeenCalledWith(mockPosition);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing liquidation price gracefully', () => {
      // Arrange
      const positionWithoutLiqPrice = {
        ...mockPosition,
        liquidationPrice: null,
      };

      // Act
      render(<PerpsPositionCard position={positionWithoutLiqPrice} />);

      // Assert
      expect(screen.getByText('$0.00')).toBeOnTheScreen(); // Should use fallback
    });

    it('handles zero position size correctly', () => {
      // Arrange
      const zeroSizePosition = {
        ...mockPosition,
        size: '0',
      };

      // Act
      render(<PerpsPositionCard position={zeroSizePosition} />);

      // Assert
      expect(screen.getByText('0.000000 ETH')).toBeOnTheScreen();
    });

    it('handles very small position sizes correctly', () => {
      // Arrange
      const smallSizePosition = {
        ...mockPosition,
        size: '0.000001',
      };

      // Act
      render(<PerpsPositionCard position={smallSizePosition} />);

      // Assert
      expect(screen.getByText('0.000001 ETH')).toBeOnTheScreen();
      expect(screen.getByText('long')).toBeOnTheScreen();
    });

    it('handles very large position sizes correctly', () => {
      // Arrange
      const largeSizePosition = {
        ...mockPosition,
        size: '1000000.123456',
      };

      // Act
      render(<PerpsPositionCard position={largeSizePosition} />);

      // Assert
      expect(screen.getByText('1000000.123456 ETH')).toBeOnTheScreen();
      expect(screen.getByText('long')).toBeOnTheScreen();
    });

    it('handles missing return on equity gracefully', () => {
      // Arrange
      const positionWithoutROE = {
        ...mockPosition,
        returnOnEquity: '0',
      };

      // Act
      render(<PerpsPositionCard position={positionWithoutROE} />);

      // Assert - Should still render without crashing
      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });
  });

  describe('Data Formatting', () => {
    it('formats prices with correct decimal places', () => {
      // Arrange
      const positionWithDecimalPrice = {
        ...mockPosition,
        entryPrice: '2000.123456',
      };

      // Act
      render(<PerpsPositionCard position={positionWithDecimalPrice} />);

      // Assert
      expect(screen.getByText('$2000.12')).toBeOnTheScreen();
    });

    it('formats leverage correctly', () => {
      // Arrange
      const positionWithHighLeverage = {
        ...mockPosition,
        leverage: { type: 'cross' as const, value: 125 },
      };

      // Act
      render(<PerpsPositionCard position={positionWithHighLeverage} />);

      // Assert
      expect(screen.getByText('125x')).toBeOnTheScreen();
    });

    it('formats different cryptocurrencies correctly', () => {
      // Arrange
      const btcPosition = {
        ...mockPosition,
        coin: 'BTC',
      };

      // Act
      render(<PerpsPositionCard position={btcPosition} />);

      // Assert
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('2.500000 BTC')).toBeOnTheScreen();
    });
  });

  describe('Event Handling', () => {
    it('prevents event propagation when action buttons are pressed', () => {
      // Arrange
      const mockOnClose = jest.fn();
      const mockOnEdit = jest.fn();

      // Act
      render(
        <PerpsPositionCard
          position={mockPosition}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
        />,
      );

      // Press action buttons
      fireEvent.press(screen.getByText('close'), {
        stopPropagation: jest.fn(),
      });
      fireEvent.press(screen.getByText('edit'), { stopPropagation: jest.fn() });

      // Assert - card press navigation should not be called
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith(
        'PerpsPositionDetails',
        {
          position: mockPosition,
          action: 'view',
        },
      );
    });
  });
});
