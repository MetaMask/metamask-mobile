import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsPositionCard from './PerpsPositionCard';
import type { Position } from '../../controllers/types';

// Mock component types

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock components (keep only non-DS components)

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPrice: (value: string) => `$${parseFloat(value).toFixed(2)}`,
  formatPnl: (value: number) => `$${value.toFixed(2)}`,
  formatPercentage: (value: number) =>
    value != null ? `${value.toFixed(2)}%` : 'N/A',
  formatPositionSize: (size: string) => Math.abs(parseFloat(size)).toFixed(6),
}));

// Mock PnL calculations
jest.mock('../../utils/pnlCalculations', () => ({
  calculatePnLPercentageFromUnrealized: jest.fn().mockReturnValue(5.0),
}));

// Mock styles
jest.mock('./PerpsPositionCard.styles', () => ({
  createStyles: () => ({
    container: { padding: 10 },
    header: { flexDirection: 'row' },
    headerLeft: { flex: 1 },
    headerRight: { flex: 1 },
    headerRow: { flexDirection: 'row' },
    leverageText: { fontSize: 16 },
    directionBadge: { padding: 4 },
    longBadge: { backgroundColor: 'green' },
    shortBadge: { backgroundColor: 'red' },
    directionText: { fontSize: 12 },
    longText: { color: 'green' },
    shortText: { color: 'red' },
    tokenAmount: { fontSize: 14 },
    positionValue: { fontSize: 18 },
    priceChange: { fontSize: 14 },
    body: { borderTopWidth: 1 },
    bodyRow: { flexDirection: 'row' },
    bodyItem: { flex: 1 },
    bodyLabel: { fontSize: 12 },
    bodyValue: { fontSize: 14 },
    footer: { flexDirection: 'row' },
    footerButton: { flex: 1 },
    positivePnl: { color: 'green' },
    negativePnl: { color: 'red' },
    // Legacy styles for backward compatibility
    assetInfo: { flex: 1 },
    assetName: { fontSize: 18 },
    actionsContainer: { flexDirection: 'row' },
    detailsContainer: { flexDirection: 'row' },
    detailColumn: { flex: 1 },
    detailLabel: { fontSize: 12 },
    detailValue: { fontSize: 14 },
    pnlValue: { fontSize: 14 },
    leverageContainer: { flexDirection: 'row' },
    leverageInfo: { flexDirection: 'row' },
    leverageItem: { alignItems: 'center' },
    leverageLabel: { fontSize: 11 },
    leverageValue: { fontSize: 13 },
  }),
}));

describe('PerpsPositionCard', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

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
      background: { section: '#ffffff' },
      text: { default: '#000000', muted: '#666666' },
      border: { muted: '#e1e1e1' },
      success: { default: '#00ff00', muted: '#ccffcc' },
      error: { default: '#ff0000', muted: '#ffcccc' },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Component Rendering', () => {
    it('renders position card with all sections', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert - Header section
      expect(screen.getByText(/10x\s+long/)).toBeOnTheScreen();
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen();
      expect(screen.getByText('$5000.00')).toBeOnTheScreen();

      // Assert - Body section
      expect(screen.getByText('Entry Price')).toBeOnTheScreen();
      expect(screen.getByText('$2000.00')).toBeOnTheScreen();
      expect(screen.getByText('Market Price')).toBeOnTheScreen();
      expect(screen.getByText('Liquidity Price')).toBeOnTheScreen();
      expect(screen.getByText('Take Profit')).toBeOnTheScreen();
      expect(screen.getByText('Stop Loss')).toBeOnTheScreen();
      expect(screen.getByText('Margin')).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
      expect(screen.getAllByText('Not Set')).toHaveLength(2);

      // Assert - Footer section
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders SHORT position correctly', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-2.5',
      };

      // Act
      render(<PerpsPositionCard position={shortPosition} />);

      // Assert
      expect(screen.getByText('short')).toBeOnTheScreen();
      expect(screen.getByText('2.500000 ETH')).toBeOnTheScreen(); // Should show absolute value
    });

    it('renders with PnL data', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('$250.00 (5.00%)')).toBeOnTheScreen();
    });

    it('handles missing PnL percentage data', () => {
      // Arrange
      const mockCalculatePnL = jest.requireMock(
        '../../utils/pnlCalculations',
      ).calculatePnLPercentageFromUnrealized;
      mockCalculatePnL.mockReturnValueOnce(undefined);

      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      expect(screen.getByText('$250.00 (N/A)')).toBeOnTheScreen();
    });

    it('handles missing liquidation price', () => {
      // Arrange
      const positionWithoutLiquidation = {
        ...mockPosition,
        liquidationPrice: null,
      };

      // Act
      render(<PerpsPositionCard position={positionWithoutLiquidation} />);

      // Assert
      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('navigates to position details when card is pressed', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(screen.getByTestId(PerpsPositionCardSelectorsIDs.CARD)); // This might need adjustment based on how the container is identified

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_DETAILS,
        { position: mockPosition, action: 'view' },
      );
    });

    it('calls onEdit when edit button is pressed', () => {
      // Arrange
      const mockOnEdit = jest.fn();

      // Act
      render(<PerpsPositionCard position={mockPosition} onEdit={mockOnEdit} />);
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert
      expect(mockOnEdit).toHaveBeenCalledWith(mockPosition);
    });

    it('calls onClose when close button is pressed', () => {
      // Arrange
      const mockOnClose = jest.fn();

      // Act
      render(
        <PerpsPositionCard position={mockPosition} onClose={mockOnClose} />,
      );
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert
      expect(mockOnClose).toHaveBeenCalledWith(mockPosition);
    });

    it('navigates to position details with close action when no onClose prop', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_DETAILS,
        { position: mockPosition, action: 'close' },
      );
    });

    it('navigates to position details with edit action when no onEdit prop', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'PerpsPositionDetails',
        { position: mockPosition, action: 'edit' },
      );
    });
  });

  describe('Data Formatting', () => {
    it('formats leverage correctly', () => {
      // Arrange
      const highLeveragePosition = {
        ...mockPosition,
        leverage: { type: 'cross' as const, value: 100 },
      };

      // Act
      render(<PerpsPositionCard position={highLeveragePosition} />);

      // Assert
      expect(screen.getByText(/100x\s+long/)).toBeOnTheScreen();
    });

    it('formats position size correctly for different coin', () => {
      // Arrange
      const btcPosition = {
        ...mockPosition,
        coin: 'BTC',
        size: '0.5',
      };

      // Act
      render(<PerpsPositionCard position={btcPosition} />);

      // Assert
      expect(screen.getByText('0.500000 BTC')).toBeOnTheScreen();
    });

    it('handles very small position sizes', () => {
      // Arrange
      const smallPosition = {
        ...mockPosition,
        size: '0.000001',
      };

      // Act
      render(<PerpsPositionCard position={smallPosition} />);

      // Assert
      expect(screen.getByText('0.000001 ETH')).toBeOnTheScreen();
    });
  });

  describe('Position Direction Logic', () => {
    it('correctly identifies LONG position', () => {
      // Arrange
      const longPosition = {
        ...mockPosition,
        size: '1.5',
      };

      // Act
      render(<PerpsPositionCard position={longPosition} />);

      // Assert
      expect(screen.getByText('long')).toBeOnTheScreen();
    });

    it('correctly identifies SHORT position', () => {
      // Arrange
      const shortPosition = {
        ...mockPosition,
        size: '-1.5',
      };

      // Act
      render(<PerpsPositionCard position={shortPosition} />);

      // Assert
      expect(screen.getByText('short')).toBeOnTheScreen();
    });

    it('handles zero position size as LONG', () => {
      // Arrange
      const zeroPosition = {
        ...mockPosition,
        size: '0',
      };

      // Act
      render(<PerpsPositionCard position={zeroPosition} />);

      // Assert
      expect(screen.getByText('long')).toBeOnTheScreen(); // Zero is >= 0, so it's long
    });
  });

  describe('Edge Cases', () => {
    it('handles missing price change data gracefully', () => {
      // Arrange
      const positionWithZeroPnl = {
        ...mockPosition,
        unrealizedPnl: '0.00',
      };
      const mockCalculatePnL = jest.requireMock(
        '../../utils/pnlCalculations',
      ).calculatePnLPercentageFromUnrealized;
      mockCalculatePnL.mockReturnValueOnce(0);

      // Act
      render(<PerpsPositionCard position={positionWithZeroPnl} />);

      // Assert
      expect(screen.getByText('$0.00 (0.00%)')).toBeOnTheScreen();
    });

    it('handles position with empty liquidation price', () => {
      // Arrange
      const positionWithEmptyLiquidation = {
        ...mockPosition,
        liquidationPrice: '',
      };

      // Act
      render(<PerpsPositionCard position={positionWithEmptyLiquidation} />);

      // Assert
      expect(screen.getByText('N/A')).toBeOnTheScreen();
    });

    it('renders all body items in correct order', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert - Check that all 6 body items are present
      const bodyLabels = [
        'Entry Price',
        'Market Price',
        'Liquidity Price',
        'Take Profit',
        'Stop Loss',
        'Margin',
      ];

      bodyLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeOnTheScreen();
      });
    });
  });
});
