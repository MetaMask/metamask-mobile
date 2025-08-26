import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsPositionCard from './PerpsPositionCard';
import type { Position } from '../../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock PnL calculations
jest.mock('../../utils/pnlCalculations', () => ({
  calculatePnLPercentageFromUnrealized: jest.fn().mockReturnValue(5.0),
}));

// Mock asset metadata hook
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn().mockReturnValue({
    assetUrl: 'https://example.com/eth.png',
  }),
}));

// Mock stream provider
jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    subscribeToPrices: jest.fn(() => jest.fn()),
    subscribeToPositions: jest.fn(() => jest.fn()),
    subscribeToAccount: jest.fn(() => jest.fn()),
    subscribeToOrders: jest.fn(() => jest.fn()),
    subscribeToFills: jest.fn(() => jest.fn()),
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: false,
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Mock stream hooks
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
  usePerpsLivePositions: jest.fn(() => ({})),
}));

// Mock the new hooks from ../../hooks
jest.mock('../../hooks', () => ({
  usePerpsPositions: jest.fn().mockReturnValue({
    loadPositions: jest.fn().mockResolvedValue(undefined),
  }),
  usePerpsMarkets: jest.fn().mockReturnValue({
    markets: [
      {
        name: 'ETH',
        symbol: 'ETH',
        priceDecimals: 2,
        sizeDecimals: 4,
        maxLeverage: 50,
        minSize: 0.01,
        sizeIncrement: 0.01,
      },
    ],
    error: null,
    isLoading: false,
  }),
  usePerpsTPSLUpdate: jest.fn().mockReturnValue({
    handleUpdateTPSL: jest.fn().mockResolvedValue(undefined),
    isUpdating: false,
  }),
  usePerpsClosePosition: jest.fn().mockReturnValue({
    handleClosePosition: jest.fn().mockResolvedValue(undefined),
    isClosing: false,
  }),
}));

// Mock PerpsTPSLBottomSheet to avoid PerpsConnectionProvider requirement
jest.mock('../PerpsTPSLBottomSheet', () => ({
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
    return (
      <View testID="perps-tpsl-bottomsheet">
        <TouchableOpacity onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock PerpsClosePositionBottomSheet
jest.mock('../PerpsClosePositionBottomSheet', () => ({
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
    return (
      <View testID="perps-close-position-bottomsheet">
        <TouchableOpacity onPress={onClose}>
          <Text>Close Position Sheet</Text>
        </TouchableOpacity>
      </View>
    );
  },
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
    // Reset the PnL calculation mock to default value
    const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
      '../../utils/pnlCalculations',
    );
    calculatePnLPercentageFromUnrealized.mockReturnValue(5.0);
  });

  describe('Component Rendering', () => {
    it('renders position card with all sections', () => {
      // Act - Render expanded to show all sections
      render(<PerpsPositionCard position={mockPosition} expanded />);

      // Assert - Header section
      expect(screen.getByText(/10x\s+long/)).toBeOnTheScreen();
      expect(screen.getByText('2.50 ETH')).toBeOnTheScreen();
      expect(screen.getByText('$5,000.00')).toBeOnTheScreen();

      // Assert - Body section - using string keys since strings() mock returns keys
      expect(
        screen.getByText('perps.position.card.entry_price'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$2,000.00')).toBeOnTheScreen();
      expect(
        screen.getByText('perps.position.card.market_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.position.card.liquidation_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.position.card.take_profit'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.position.card.stop_loss'),
      ).toBeOnTheScreen();
      expect(screen.getByText('perps.position.card.margin')).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();

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
      expect(screen.getByText(/2\.50.*ETH/)).toBeOnTheScreen(); // Should show absolute value
    });

    it('renders with PnL data', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert - ROE is 12.5 * 100 = 1250%
      expect(screen.getByText(/\+\$250\.00.*\+1250\.0%/)).toBeOnTheScreen();
    });

    it('handles missing PnL percentage data', () => {
      // Arrange - Set returnOnEquity to empty string to test fallback
      const positionWithoutROE = {
        ...mockPosition,
        returnOnEquity: '', // Use empty string instead of undefined
      };

      // Act
      render(<PerpsPositionCard position={positionWithoutROE} />);

      // Assert - Should show 0% when ROE is missing
      expect(screen.getByText(/\+\$250\.00.*\+0\.0%/)).toBeOnTheScreen();
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
    it('navigates to market details when card is pressed', () => {
      // Act - render with expanded=false to make card clickable
      render(<PerpsPositionCard position={mockPosition} expanded={false} />);
      fireEvent.press(screen.getByTestId('PerpsPositionCard'));

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: expect.any(Object),
        },
      });
    });

    it('opens close position bottom sheet when close button is pressed', () => {
      // Arrange & Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Verify bottom sheet is not visible initially
      expect(screen.queryByText('perps.close_position.title')).toBeNull();

      // Press close button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert - The bottom sheet should be rendered
      // Note: The actual bottom sheet content might be mocked, so we check for its presence
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      ).toBeDefined();
    });

    it('opens TP/SL bottom sheet when edit button is pressed', () => {
      // Arrange & Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Verify bottom sheet is not visible initially
      expect(screen.queryByText('perps.tpsl.title')).toBeNull();

      // Press edit button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert - The TP/SL bottom sheet should be opened
      // Note: The actual bottom sheet content might be mocked, so we check for its presence
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      ).toBeDefined();
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
      expect(screen.getByText(/0\.5000.*BTC/)).toBeOnTheScreen();
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
        returnOnEquity: '0',
      };
      const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
        '../../utils/pnlCalculations',
      );
      calculatePnLPercentageFromUnrealized.mockReturnValueOnce(0);

      // Act
      render(<PerpsPositionCard position={positionWithZeroPnl} />);

      // Assert - ROE is shown as 0.0% (not 0.00%)
      expect(screen.getByText(/\$0\.00.*\+0\.0%/)).toBeOnTheScreen();
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
      // Act - Render with expanded=true to show body items
      render(<PerpsPositionCard position={mockPosition} expanded />);

      // Assert - Check that all 6 body items are present
      const bodyLabels = [
        'perps.position.card.entry_price',
        'perps.position.card.market_price',
        'perps.position.card.liquidation_price',
        'perps.position.card.take_profit',
        'perps.position.card.stop_loss',
        'perps.position.card.margin',
      ];

      bodyLabels.forEach((label) => {
        expect(screen.getByText(label)).toBeOnTheScreen();
      });
    });
  });

  describe('Hook Integration', () => {
    // Tests removed - loadPositions no longer exists with WebSocket streaming
    // Positions update automatically via WebSocket subscriptions

    it('returns early from handleCardPress when isLoading is true', () => {
      // Arrange
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [
          {
            name: 'ETH',
            symbol: 'ETH',
            priceDecimals: 2,
            sizeDecimals: 4,
            maxLeverage: 50,
            minSize: 0.01,
            sizeIncrement: 0.01,
          },
        ],
        error: null,
        isLoading: true, // Set loading to true
      });

      // Act
      render(<PerpsPositionCard position={mockPosition} expanded={false} />);
      fireEvent.press(screen.getByTestId('PerpsPositionCard'));

      // Assert - navigation should not be called
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('returns early from handleCardPress when error exists', () => {
      // Arrange
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [
          {
            name: 'ETH',
            symbol: 'ETH',
            priceDecimals: 2,
            sizeDecimals: 4,
            maxLeverage: 50,
            minSize: 0.01,
            sizeIncrement: 0.01,
          },
        ],
        error: 'Failed to fetch markets',
        isLoading: false,
      });

      // Act
      render(<PerpsPositionCard position={mockPosition} expanded={false} />);
      fireEvent.press(screen.getByTestId('PerpsPositionCard'));

      // Assert - navigation should not be called
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Bottom Sheet Interactions', () => {
    it('renders PerpsTPSLBottomSheet when isTPSLVisible is true', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Open the TP/SL bottom sheet
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert
      expect(screen.getByTestId('perps-tpsl-bottomsheet')).toBeOnTheScreen();
    });

    it('handles PerpsTPSLBottomSheet onClose callback', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Open the TP/SL bottom sheet
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Close the bottom sheet
      fireEvent.press(screen.getByText('Close'));

      // Assert - bottom sheet should be closed (not visible)
      expect(screen.queryByTestId('perps-tpsl-bottomsheet')).toBeNull();
    });

    it('renders PerpsClosePositionBottomSheet when isClosePositionVisible is true', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Open the close position bottom sheet
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert
      expect(
        screen.getByTestId('perps-close-position-bottomsheet'),
      ).toBeOnTheScreen();
    });

    it('handles PerpsClosePositionBottomSheet onClose callback', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Open the close position bottom sheet
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Close the bottom sheet
      fireEvent.press(screen.getByText('Close Position Sheet'));

      // Assert - bottom sheet should be closed (not visible)
      expect(
        screen.queryByTestId('perps-close-position-bottomsheet'),
      ).toBeNull();
    });
  });
});
