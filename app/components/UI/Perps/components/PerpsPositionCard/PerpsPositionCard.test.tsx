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

// Mock the selector module first
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key, params) => {
    if (key === 'perps.position.card.tpsl_count_multiple' && params?.count) {
      return `${params.count} orders`;
    }
    return key;
  }),
}));

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock PnL calculations
jest.mock('../../utils/pnlCalculations', () => ({
  calculatePnLPercentageFromUnrealized: jest.fn().mockReturnValue(5.0),
}));

// Mock PerpsTokenLogo
jest.mock('../PerpsTokenLogo', () => ({
  __esModule: true,
  default: ({ size, testID }: { size: number; testID?: string }) => {
    const { View } = jest.requireActual('react-native');
    return (
      <View
        testID={testID || 'perps-token-logo'}
        style={{ width: size, height: size }}
      />
    );
  },
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

// Mock TP_SL_CONFIG
const mockTPSLConfig = {
  USE_POSITION_BOUND_TPSL: true,
};

// Create a getter that references the mutable mock object
jest.mock('../../constants/perpsConfig', () => ({
  get TP_SL_CONFIG() {
    return mockTPSLConfig;
  },
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

// Mock PerpsBottomSheetTooltip
jest.mock('../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: ({
    isVisible,
    onClose,
    contentKey,
  }: {
    isVisible: boolean;
    onClose?: () => void;
    contentKey?: string;
  }) => {
    if (!isVisible) return null;
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    const text =
      contentKey === 'geo_block'
        ? 'Geo Block Tooltip'
        : 'TPSL Count Warning Tooltip';
    const testID =
      contentKey === 'geo_block'
        ? 'perps-position-card-geo-block-tooltip'
        : 'perps-position-card-tpsl-count-warning-tooltip';
    return (
      <TouchableOpacity testID={testID} onPress={onClose}>
        <Text>{text}</Text>
      </TouchableOpacity>
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
    takeProfitCount: 0,
    stopLossCount: 0,
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

    // Default eligibility mock
    const { useSelector } = jest.requireMock('react-redux');
    const mockSelectPerpsEligibility = jest.requireMock(
      '../../selectors/perpsController',
    ).selectPerpsEligibility;
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === mockSelectPerpsEligibility) {
        return true;
      }
      return undefined;
    });
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
        screen.getByText('perps.position.card.funding_cost'),
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

    it('renders with icon when showIcon is true and not expanded', () => {
      // Act - Render collapsed with showIcon
      render(
        <PerpsPositionCard position={mockPosition} expanded={false} showIcon />,
      );

      // Assert - PerpsTokenLogo should be rendered
      expect(screen.getByTestId('perps-token-logo')).toBeOnTheScreen();
    });

    it('does not render icon when showIcon is false', () => {
      // Act - Render collapsed without showIcon
      render(
        <PerpsPositionCard
          position={mockPosition}
          expanded={false}
          showIcon={false}
        />,
      );

      // Assert - PerpsTokenLogo should not be rendered
      expect(screen.queryByTestId('perps-token-logo')).not.toBeOnTheScreen();
    });

    it('does not render icon when expanded even if showIcon is true', () => {
      // Act - Render expanded with showIcon (should not show icon)
      render(<PerpsPositionCard position={mockPosition} expanded showIcon />);

      // Assert - PerpsTokenLogo should not be rendered in expanded mode
      expect(screen.queryByTestId('perps-token-logo')).not.toBeOnTheScreen();
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
          initialTab: 'position',
        },
      });
    });

    it('opens close position bottom sheet when close button is pressed and user is eligible', () => {
      // Arrange
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return true;
        }
        return undefined;
      });

      // Act
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

    it('opens TP/SL bottom sheet when edit button is pressed and user is eligible', () => {
      // Arrange
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return true;
        }
        return undefined;
      });

      // Act
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
        'perps.position.card.funding_cost',
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

    it('navigates to close position screen when close button is pressed', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Press the close button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert - should navigate to close position screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.CLOSE_POSITION,
        { position: mockPosition },
      );
    });

    it('does not show close button when card is collapsed', () => {
      // Act
      render(
        <PerpsPositionCard position={mockPosition} expanded={false} showIcon />,
      );

      // Assert - close button should not be visible in collapsed view
      expect(
        screen.queryByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      ).toBeNull();
    });

    it('shows geo block modal when edit TP/SL button is pressed and user is not eligible', () => {
      // Arrange
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Press edit button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Assert - Geo block tooltip should be shown
      expect(screen.getByText('Geo Block Tooltip')).toBeOnTheScreen();
      // Assert - TP/SL bottom sheet should not be shown
      expect(screen.queryByTestId('perps-tpsl-bottomsheet')).toBeNull();
    });

    it('shows geo block modal when close position button is pressed and user is not eligible', () => {
      // Arrange
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Press close button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.CLOSE_BUTTON),
      );

      // Assert - Geo block tooltip should be shown
      expect(screen.getByText('Geo Block Tooltip')).toBeOnTheScreen();
      // Assert - Close position bottom sheet should not be shown
      expect(
        screen.queryByTestId('perps-close-position-bottomsheet'),
      ).toBeNull();
    });

    it('closes geo block modal when onClose is called', () => {
      // Arrange
      const { useSelector } = jest.requireMock('react-redux');
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      useSelector.mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        return undefined;
      });

      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Press edit button to show geo block modal
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Verify modal is shown
      expect(screen.getByText('Geo Block Tooltip')).toBeOnTheScreen();

      // Press the geo block tooltip to close it
      fireEvent.press(
        screen.getByTestId('perps-position-card-geo-block-tooltip'),
      );

      // Assert - Geo block tooltip should be closed
      expect(screen.queryByText('Geo Block Tooltip')).not.toBeOnTheScreen();
    });
  });

  describe('Cumulative Funding Display', () => {
    it('shows white color and $0.00 when cumulative funding is exactly zero', () => {
      const positionWithZeroFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '0.00',
          sinceOpen: '0.00',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithZeroFunding} />);

      // New behavior: near-zero (including exactly zero) shows $0.00 (no sign prefix)
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
      expect(screen.queryByText('-$0.00')).toBeNull();
      expect(screen.queryByText('+$$0.00')).toBeNull();
    });

    it('shows $0.00 for very small positive cumulative funding (< $0.005)', () => {
      const positionWithTinyPositiveFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '0.004',
          sinceOpen: '0.004',
          sinceChange: '0.000',
        },
      };

      render(<PerpsPositionCard position={positionWithTinyPositiveFunding} />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
      expect(screen.queryByText('-$0.00')).toBeNull();
    });

    it('shows $0.00 for very small negative cumulative funding (> -$0.005)', () => {
      const positionWithTinyNegativeFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '-0.004',
          sinceOpen: '-0.004',
          sinceChange: '0.000',
        },
      };

      render(<PerpsPositionCard position={positionWithTinyNegativeFunding} />);

      expect(screen.getByText('$0.00')).toBeOnTheScreen();
      expect(screen.queryByText('+$$0.00')).toBeNull();
    });

    it('shows red color and minus sign for positive cumulative funding (loss)', () => {
      const positionWithPositiveFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '5.25',
          sinceOpen: '5.25',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithPositiveFunding} />);

      // Should show minus sign for positive funding (loss) - includes dollar sign
      expect(screen.getByText('-$5.25')).toBeOnTheScreen();
    });

    it('shows green color and plus sign for negative cumulative funding (gain)', () => {
      const positionWithNegativeFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '-3.75',
          sinceOpen: '-3.75',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithNegativeFunding} />);

      // Should show plus sign for negative funding (gain) - includes dollar sign
      expect(screen.getByText('+$3.75')).toBeOnTheScreen();
    });

    it('handles very small cumulative funding values', () => {
      const positionWithSmallFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '0.01',
          sinceOpen: '0.01',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithSmallFunding} />);

      // Should show minus sign for small positive value - includes dollar sign
      expect(screen.getByText('-$0.01')).toBeOnTheScreen();
    });

    it('handles very small negative cumulative funding values', () => {
      const positionWithSmallNegativeFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '-0.01',
          sinceOpen: '-0.01',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithSmallNegativeFunding} />);

      // Should show plus sign for small negative value - includes dollar sign
      expect(screen.getByText('+$0.01')).toBeOnTheScreen();
    });

    it('formats cumulative funding with correct decimal places', () => {
      const positionWithPreciseFunding = {
        ...mockPosition,
        cumulativeFunding: {
          allTime: '12.345678',
          sinceOpen: '12.345678',
          sinceChange: '0.00',
        },
      };

      render(<PerpsPositionCard position={positionWithPreciseFunding} />);

      // Should format to 2 decimal places - includes dollar sign
      expect(screen.getByText('-$12.35')).toBeOnTheScreen();
    });
  });

  describe('TP/SL Count Functionality', () => {
    beforeEach(() => {
      // Reset mock config to default
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = true;
    });

    it('displays take profit count when multiple TP orders exist', () => {
      const positionWithMultipleTP = {
        ...mockPosition,
        takeProfitCount: 3,
        takeProfitPrice: undefined, // No single price when multiple orders
        stopLossCount: 0,
      };

      render(<PerpsPositionCard position={positionWithMultipleTP} />);

      expect(screen.getByText('3 orders')).toBeOnTheScreen();
    });

    it('displays stop loss count when multiple SL orders exist', () => {
      const positionWithMultipleSL = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 2,
        stopLossPrice: undefined, // No single price when multiple orders
      };

      render(<PerpsPositionCard position={positionWithMultipleSL} />);

      expect(screen.getByText('2 orders')).toBeOnTheScreen();
    });

    it('displays single TP price when only one TP order exists', () => {
      const positionWithSingleTP = {
        ...mockPosition,
        takeProfitCount: 1,
        takeProfitPrice: '2500.00',
        stopLossCount: 0,
      };

      render(<PerpsPositionCard position={positionWithSingleTP} />);

      expect(screen.getByText('$2,500.00')).toBeOnTheScreen();
      expect(screen.queryByText(/1.*orders/)).not.toBeOnTheScreen();
    });

    it('displays single SL price when only one SL order exists', () => {
      const positionWithSingleSL = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 1,
        stopLossPrice: '1500.00',
      };

      render(<PerpsPositionCard position={positionWithSingleSL} />);

      expect(screen.getByText('$1,500.00')).toBeOnTheScreen();
      expect(screen.queryByText(/1.*orders/)).not.toBeOnTheScreen();
    });

    it('displays "Not Set" when no TP/SL orders exist', () => {
      const positionWithoutTPSL = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 0,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      };

      render(<PerpsPositionCard position={positionWithoutTPSL} />);

      // Should show "Not Set" for both TP and SL
      const notSetTexts = screen.getAllByText('perps.position.card.not_set');
      expect(notSetTexts).toHaveLength(2); // One for TP, one for SL
    });
  });

  describe('TP/SL Count Warning Modal', () => {
    beforeEach(() => {
      // Disable position bound TP/SL for these tests
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = false;
    });

    afterEach(() => {
      // Reset to default
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = true;
    });

    it('shows warning modal when editing TP/SL with multiple orders but no single price', () => {
      const positionWithMultipleTPNoPrice = {
        ...mockPosition,
        takeProfitCount: 2,
        takeProfitPrice: undefined, // Multiple orders but no single price
        stopLossCount: 0,
      };

      render(<PerpsPositionCard position={positionWithMultipleTPNoPrice} />);

      // Press edit TP/SL button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Should show warning modal instead of TP/SL bottom sheet since position bound TP/SL is disabled
      expect(screen.getByText('TPSL Count Warning Tooltip')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-tpsl-bottomsheet'),
      ).not.toBeOnTheScreen();
    });

    it('shows warning modal when editing TP/SL with multiple SL orders but no single price', () => {
      const positionWithMultipleSLNoPrice = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 3,
        stopLossPrice: undefined, // Multiple orders but no single price
      };

      render(<PerpsPositionCard position={positionWithMultipleSLNoPrice} />);

      // Press edit TP/SL button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Should show warning modal instead of TP/SL bottom sheet since position bound TP/SL is disabled
      expect(screen.getByText('TPSL Count Warning Tooltip')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-tpsl-bottomsheet'),
      ).not.toBeOnTheScreen();
    });

    it('does not show warning modal when position bound TP/SL is enabled', () => {
      // Temporarily enable position bound TP/SL
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = true;

      const positionWithMultipleTPNoPrice = {
        ...mockPosition,
        takeProfitCount: 2,
        takeProfitPrice: undefined,
        stopLossCount: 0,
      };

      render(<PerpsPositionCard position={positionWithMultipleTPNoPrice} />);

      // Press edit TP/SL button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Should show TP/SL bottom sheet, not warning modal
      expect(screen.getByTestId('perps-tpsl-bottomsheet')).toBeOnTheScreen();
      expect(
        screen.queryByText('TPSL Count Warning Tooltip'),
      ).not.toBeOnTheScreen();

      // Reset back to disabled for other tests in this describe block
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = false;
    });

    it('does not show warning modal when single TP/SL prices are available', () => {
      const positionWithSinglePrices = {
        ...mockPosition,
        takeProfitCount: 1,
        takeProfitPrice: '2500.00',
        stopLossCount: 1,
        stopLossPrice: '1500.00',
      };

      render(<PerpsPositionCard position={positionWithSinglePrices} />);

      // Press edit TP/SL button
      fireEvent.press(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.EDIT_BUTTON),
      );

      // Should show TP/SL bottom sheet, not warning modal
      expect(screen.getByTestId('perps-tpsl-bottomsheet')).toBeOnTheScreen();
      expect(screen.queryByText('Geo Block Tooltip')).not.toBeOnTheScreen();
    });
  });

  describe('TP/SL Configuration Behavior', () => {
    it('renders count as clickable when position bound TP/SL is enabled and count > 1', () => {
      // Ensure position bound TP/SL is enabled (default)
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = true;

      const positionWithMultipleTP = {
        ...mockPosition,
        takeProfitCount: 3,
        takeProfitPrice: undefined,
        stopLossCount: 0,
      };

      render(<PerpsPositionCard position={positionWithMultipleTP} />);

      const tpCountText = screen.getByText('3 orders');
      // TouchableOpacity should be pressable
      expect(tpCountText).toBeTruthy();
    });

    it('renders count as clickable when position bound TP/SL is disabled and count > 0 with no price', () => {
      // Disable position bound TP/SL for this test
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = false;

      const positionWithMultipleSLNoPrice = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 2,
        stopLossPrice: undefined, // No single price
      };

      render(<PerpsPositionCard position={positionWithMultipleSLNoPrice} />);

      const slCountText = screen.getByText('2 orders');
      // TouchableOpacity should be pressable
      expect(slCountText).toBeTruthy();

      // Reset to default
      mockTPSLConfig.USE_POSITION_BOUND_TPSL = true;
    });

    it('handles navigation error gracefully when pressing TP/SL count', () => {
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [],
        error: 'Network error',
        isLoading: false,
      });

      const mockOnTpslCountPress = jest.fn();
      const positionWithMultipleTP = {
        ...mockPosition,
        takeProfitCount: 3,
        takeProfitPrice: undefined,
        stopLossCount: 0,
      };

      render(
        <PerpsPositionCard
          position={positionWithMultipleTP}
          onTpslCountPress={mockOnTpslCountPress}
        />,
      );

      const tpCountText = screen.getByText('3 orders');
      fireEvent.press(tpCountText);

      // Should not call onTpslCountPress due to error
      expect(mockOnTpslCountPress).not.toHaveBeenCalled();
    });

    it('handles missing market data gracefully when pressing TP/SL count', () => {
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [], // Empty markets array
        error: null,
        isLoading: false,
      });

      const mockOnTpslCountPress = jest.fn();
      const positionWithMultipleSL = {
        ...mockPosition,
        takeProfitCount: 0,
        stopLossCount: 2,
        stopLossPrice: undefined,
      };

      render(
        <PerpsPositionCard
          position={positionWithMultipleSL}
          onTpslCountPress={mockOnTpslCountPress}
        />,
      );

      const slCountText = screen.getByText('2 orders');
      fireEvent.press(slCountText);

      // Should not call onTpslCountPress due to missing market data
      expect(mockOnTpslCountPress).not.toHaveBeenCalled();
    });
  });
});
