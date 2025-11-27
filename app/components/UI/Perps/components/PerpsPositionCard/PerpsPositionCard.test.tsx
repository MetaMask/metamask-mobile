import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PerpsPositionCardSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import PerpsPositionCard from './PerpsPositionCard';
import type { Position } from '../../controllers/types';

jest.mock('@react-navigation/native', () => ({
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
    if (key === 'perps.position.card.tpsl_count_single' && params?.count) {
      return `${params.count} order`;
    }
    if (key === 'perps.market.long_lowercase' || key === 'perps.market.long') {
      return 'long';
    }
    if (
      key === 'perps.market.short_lowercase' ||
      key === 'perps.market.short'
    ) {
      return 'short';
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
        price: '$2,000.00',
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
  usePerpsLivePrices: jest.fn(() => ({})),
}));

// Mock PerpsTPSLView to avoid PerpsConnectionProvider requirement
jest.mock('../../Views/PerpsTPSLView/PerpsTPSLView', () => ({
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
    mockUseTheme.mockReturnValue(mockTheme);
    // Reset the PnL calculation mock to default value
    const { calculatePnLPercentageFromUnrealized } = jest.requireMock(
      '../../utils/pnlCalculations',
    );
    calculatePnLPercentageFromUnrealized.mockReturnValue(5.0);

    // Reset the usePerpsMarkets mock to include price
    const { usePerpsMarkets } = jest.requireMock('../../hooks');
    usePerpsMarkets.mockReturnValue({
      markets: [
        {
          name: 'ETH',
          symbol: 'ETH',
          price: '$2,000.00',
          priceDecimals: 2,
          sizeDecimals: 4,
          maxLeverage: 50,
          minSize: 0.01,
          sizeIncrement: 0.01,
        },
      ],
      error: null,
      isLoading: false,
    });

    // Mock usePerpsLivePrices to return live price data for ETH
    const { usePerpsLivePrices } = jest.requireMock('../../hooks');
    usePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '2100.50',
        timestamp: Date.now(),
        percentChange24h: '2.5',
      },
    });

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
      // Arrange
      const currentPrice = 2000;

      // Act
      render(
        <PerpsPositionCard
          position={mockPosition}
          currentPrice={currentPrice}
        />,
      );

      // Assert - Header section
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.HEADER),
      ).toBeOnTheScreen();

      // Assert - P&L section
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.PNL_CARD),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.PNL_VALUE),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.RETURN_CARD),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.RETURN_VALUE),
      ).toBeOnTheScreen();

      // Assert - Size/Margin row
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SIZE_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.SIZE_VALUE),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.MARGIN_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.MARGIN_VALUE),
      ).toBeOnTheScreen();

      // Assert - Auto-close section
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.AUTO_CLOSE_TOGGLE),
      ).toBeOnTheScreen();

      // Assert - Details section
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.DETAILS_SECTION),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsPositionCardSelectorsIDs.DIRECTION_VALUE),
      ).toHaveTextContent(/long\s+10x/);
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
      const directionValue = screen.getByTestId(
        PerpsPositionCardSelectorsIDs.DIRECTION_VALUE,
      );
      expect(directionValue).toHaveTextContent(/short\s+10x/);
      const sizeValue = screen.getByTestId(
        PerpsPositionCardSelectorsIDs.SIZE_VALUE,
      );
      expect(sizeValue).toHaveTextContent(/2\.5.*ETH/); // Should show absolute value
    });

    it('renders with PnL data', () => {
      // Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      const pnlValue = screen.getByTestId(
        PerpsPositionCardSelectorsIDs.PNL_VALUE,
      );
      expect(pnlValue).toHaveTextContent(/\+\$250\.00/);
      const returnValue = screen.getByTestId(
        PerpsPositionCardSelectorsIDs.RETURN_VALUE,
      );
      expect(returnValue).toHaveTextContent(/\+1250\.00%/); // ROE is 12.5 * 100 = 1250%
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
      const returnValue = screen.getByTestId(
        PerpsPositionCardSelectorsIDs.RETURN_VALUE,
      );
      expect(returnValue).toHaveTextContent(/\+0\.00%/);
    });

    it('handles missing liquidation price', () => {
      // Arrange
      const positionWithoutLiquidation = {
        ...mockPosition,
        liquidationPrice: null,
      };

      // Act
      render(<PerpsPositionCard position={positionWithoutLiquidation} />);

      // Assert - Displays standardized price fallback
      expect(
        screen.getByText(PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY),
      ).toBeOnTheScreen();
    });
  });

  describe('Data Formatting', () => {
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
      expect(screen.getByText(/0\.5.*BTC/)).toBeOnTheScreen(); // Trailing zeros removed
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

  describe('Edge Cases', () => {
    it('handles position with empty liquidation price', () => {
      // Arrange
      const positionWithEmptyLiquidation = {
        ...mockPosition,
        liquidationPrice: '',
      };

      // Act
      render(<PerpsPositionCard position={positionWithEmptyLiquidation} />);

      // Assert - Empty string gets parsed as NaN and displays fallback
      expect(
        screen.getByText(PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY),
      ).toBeOnTheScreen();
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

  describe('Share Button Functionality', () => {
    it('does not render share button when onSharePress not provided', () => {
      // Arrange & Act
      render(<PerpsPositionCard position={mockPosition} />);

      // Assert
      const shareButton = screen.queryByTestId(
        PerpsPositionCardSelectorsIDs.SHARE_BUTTON,
      );
      expect(shareButton).toBeNull();
    });
  });
});
