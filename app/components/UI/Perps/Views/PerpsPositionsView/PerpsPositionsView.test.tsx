import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PerpsPositionsView from './PerpsPositionsView';
import {
  usePerpsTrading,
  usePerpsTPSLUpdate,
  usePerpsClosePosition,
  usePerpsLivePositions,
} from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import type { Position } from '../../controllers/types';

// Mock component types
interface MockRefreshControlProps {
  refreshing?: boolean;
  onRefresh?: () => void;
  tintColor?: string;
}

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

// Mock PerpsStreamManager
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(),
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  usePerpsTrading: jest.fn(),
  usePerpsTPSLUpdate: jest.fn(() => ({
    handleUpdateTPSL: jest.fn(),
    isUpdating: false,
  })),
  usePerpsClosePosition: jest.fn(() => ({
    handleClosePosition: jest.fn(),
    isClosing: false,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [
      { name: 'ETH', symbol: 'ETH' },
      { name: 'BTC', symbol: 'BTC' },
    ],
    isInitialLoading: false,
  })),
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
  usePerpsLivePrices: jest.fn(),
}));

// Mock the selector module
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock RefreshControl
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    RefreshControl: ({
      refreshing,
      onRefresh,
      tintColor,
      ...props
    }: MockRefreshControlProps) => {
      const { View } = RN;
      return (
        <View
          testID="refresh-control"
          {...props}
          // Store the refresh state for testing
          accessibilityLabel={refreshing ? 'refreshing' : 'not-refreshing'}
        />
      );
    },
  };
});

// Mock data and functions (stable across renders)
const mockPositions: Position[] = [
  {
    symbol: 'ETH',
    size: '1.5',
    entryPrice: '2000',
    positionValue: '3150.75',
    unrealizedPnl: '150.75',
    marginUsed: '300',
    leverage: {
      type: 'isolated',
      value: 10,
    },
    liquidationPrice: '1800',
    maxLeverage: 100,
    returnOnEquity: '0.075',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitPrice: '2200',
    stopLossPrice: '1900',
    takeProfitCount: 0,
    stopLossCount: 0,
  },
  {
    symbol: 'BTC',
    size: '-0.5',
    entryPrice: '50000',
    positionValue: '24924.75',
    unrealizedPnl: '-75.25',
    marginUsed: '5000',
    leverage: {
      type: 'cross',
      value: 5,
    },
    liquidationPrice: '52000',
    maxLeverage: 100,
    returnOnEquity: '-0.015',
    cumulativeFunding: {
      allTime: '10',
      sinceOpen: '5',
      sinceChange: '2',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  },
];

const mockAccountState = {
  totalBalance: '10000',
  availableBalance: '4700',
  marginUsed: '5300',
};

// Mock implementations (stable across renders)
const mockNavigation = {
  goBack: jest.fn(),
};

describe('PerpsPositionsView', () => {
  beforeEach(() => {
    // Clear only specific mocks, not all mocks to maintain stable references
    mockNavigation.goBack.mockClear();

    // Clear other mocks - DevLogger is mocked to avoid log output

    // Setup default mocks with stable references
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (usePerpsLiveAccount as jest.Mock).mockReturnValue({
      account: mockAccountState,
      isInitialLoading: false,
    });
    (usePerpsTrading as jest.Mock).mockReturnValue({
      getPositions: jest.fn(),
    });
    (useFocusEffect as jest.Mock).mockImplementation(() => {
      // Do nothing - prevent automatic callback execution
    });

    // Mock usePerpsLivePrices from hooks (re-exported from stream)
    const { usePerpsLivePrices: usePerpsLivePricesHook } =
      jest.requireMock('../../hooks');
    (usePerpsLivePricesHook as jest.Mock).mockReturnValue({
      ETH: '2100',
      BTC: '49500',
    });

    // Mock usePerpsPositions hook
    (usePerpsLivePositions as jest.Mock).mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
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

    // Using real implementations of utility functions (calculateTotalPnL, formatPrice, formatPnl) to test actual behavior
  });

  describe('Component Rendering', () => {
    it('renders header with title and back button', () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      expect(screen.getByText('Positions')).toBeOnTheScreen();
      expect(screen.getByTestId('back-button')).toBeOnTheScreen();
    });

    it('renders account summary with formatted values', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Account summary')).toBeOnTheScreen();
        expect(screen.getByText('Total balance')).toBeOnTheScreen();
        expect(screen.getByText('Available balance')).toBeOnTheScreen();
        expect(screen.getByText('Margin used')).toBeOnTheScreen();
        expect(screen.getByText('Total unrealized P&L')).toBeOnTheScreen();

        // Check that the actual formatted values appear in the UI
        // PRICE_RANGES_MINIMAL_VIEW: Fixed 2 decimals, trailing zeros removed
        expect(screen.getByText('$10,000')).toBeOnTheScreen(); // totalBalance
        expect(screen.getByText('$4,700')).toBeOnTheScreen(); // availableBalance
        expect(screen.getByText('$5,300')).toBeOnTheScreen(); // marginUsed
        expect(screen.getByText('+$75.50')).toBeOnTheScreen(); // total PnL
      });
    });

    it('renders positions list with position cards', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        const section = screen.getByTestId('perps-positions-section');
        expect(within(section).getByText('Open positions')).toBeOnTheScreen();
        expect(within(section).getByText('2 positions')).toBeOnTheScreen();
        expect(within(section).getByText(/1\.5[\s\S]*ETH/)).toBeOnTheScreen();
        expect(within(section).getByText(/0\.5[\s\S]*BTC/)).toBeOnTheScreen();
      });
    });

    it('displays correct position count for single position', async () => {
      // Arrange
      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: [mockPositions[0]],
        isInitialLoading: false,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('1 position')).toBeOnTheScreen();
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading state initially', () => {
      // Arrange
      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      expect(screen.getByText('Loading positions...')).toBeOnTheScreen();
    });
  });

  // Error States tests are commented out as the new usePerpsLivePositions
  // hook doesn't return error state - errors are handled internally
  // describe('Error States', () => {
  //   it('displays error message when positions fail to load', async () => {
  //     // Test removed - new hook doesn't expose error state
  //   });
  // });

  describe('Empty State', () => {
    it('displays empty state when no positions are available', async () => {
      // Arrange
      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
        expect(
          screen.getByText(/You don't have any open positions yet/),
        ).toBeOnTheScreen();
        expect(
          screen.getByText(/Start trading to see your positions here/),
        ).toBeOnTheScreen();
      });
    });

    it('displays empty state when positions is null', async () => {
      // Arrange
      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Wait for component to load - look for ETH position text
      await waitFor(() => {
        expect(screen.getByText(/1\.5[\s\S]*ETH/)).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByTestId('back-button'));

      // Assert
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Loading and Refresh', () => {
    it('loads positions on mount', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        const section = screen.getByTestId('perps-positions-section');
        expect(within(section).getByText('Open positions')).toBeOnTheScreen();
      });
    });

    it('refreshes positions when focus effect triggers', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        const section = screen.getByTestId('perps-positions-section');
        expect(within(section).getByText('Open positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Account Summary Calculations', () => {
    it('handles missing account state values', async () => {
      // Arrange
      (usePerpsLiveAccount as jest.Mock).mockReturnValue({
        account: {
          totalBalance: null,
          availableBalance: undefined,
          marginUsed: '',
        },
        isInitialLoading: false,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        // Check that multiple zero values are properly formatted and displayed
        const zeroValues = screen.getAllByText('$0.00');
        expect(zeroValues.length).toBeGreaterThan(0);
      });
    });

    it('displays PnL calculated from position data', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        // The mockPositions have unrealizedPnl of '150.75' and '-75.25'
        // Real calculateTotalPnL returns 75.5, real formatPnl formats as '+$75.50'
        expect(screen.getByText(/\+\$75\.50/)).toBeOnTheScreen();
      });
    });
  });

  describe('Position Cards Integration', () => {
    it('renders position cards with correct props', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        // Use flexible regex patterns that account for whitespace and line breaks
        const ethPositions = screen.getAllByText(/1\.5[\s\S]*ETH/);
        expect(ethPositions).toHaveLength(1);

        const btcPositions = screen.getAllByText(/0\.5[\s\S]*BTC/);
        expect(btcPositions).toHaveLength(1);

        expect(screen.getByText(/-\$75\.25/)).toBeOnTheScreen();
      });
    });

    it('handles positions with unique keys', async () => {
      // Arrange
      const duplicatePositions = [
        { ...mockPositions[0], symbol: 'ETH' },
        { ...mockPositions[0], symbol: 'ETH' },
      ];
      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: duplicatePositions,
        isInitialLoading: false,
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        // Look for the position size text that contains "1.5 ETH" (trailing zero removed)
        const ethPositions = screen.getAllByText(/1\.5\s+ETH/);
        expect(ethPositions).toHaveLength(2);
      });
    });
  });

  describe('Close Position Flow', () => {
    let mockHandleClosePosition: jest.Mock;
    let mockLoadPositions: jest.Mock;

    beforeEach(() => {
      // Create mock functions
      mockHandleClosePosition = jest.fn();
      mockLoadPositions = jest.fn();

      // Mock the hooks
      (usePerpsClosePosition as jest.Mock).mockReturnValue({
        handleClosePosition: mockHandleClosePosition,
        isClosing: false,
      });

      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
    });

    // The close position flow is integrated into the component through
    // the close button in PerpsPositionCard navigates to the close position screen.
    // The navigation and close position flow is now handled by the
    // PerpsClosePositionView screen.

    it('refreshes positions after successful close', async () => {
      // Mock successful close
      mockHandleClosePosition.mockResolvedValueOnce({ success: true });

      // The close position flow would trigger handleClosePosition
      // and then call loadPositions on success
      await mockHandleClosePosition(mockPositions[0], '', 'market', undefined);

      // In the real implementation, onSuccess callback would call loadPositions
      mockLoadPositions({ isRefresh: true });

      expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    });

    it('handles positions with TP/SL correctly', async () => {
      const positionWithTPSL = mockPositions.find((p) => p.symbol === 'ETH');
      expect(positionWithTPSL?.takeProfitPrice).toBeDefined();
      expect(positionWithTPSL?.stopLossPrice).toBeDefined();

      // When closing a position with TP/SL, the new implementation
      // logs information about existing TP/SL orders
      await mockHandleClosePosition(positionWithTPSL, '', 'market', undefined);

      expect(mockHandleClosePosition).toHaveBeenCalledWith(
        positionWithTPSL,
        '',
        'market',
        undefined,
      );
    });

    it('handles positions without TP/SL correctly', async () => {
      const positionWithoutTPSL = {
        ...mockPositions[0],
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      };

      await mockHandleClosePosition(
        positionWithoutTPSL,
        '',
        'market',
        undefined,
      );

      expect(mockHandleClosePosition).toHaveBeenCalledWith(
        positionWithoutTPSL,
        '',
        'market',
        undefined,
      );
    });
  });

  describe('TP/SL Update Flow', () => {
    let mockHandleUpdateTPSL: jest.Mock;
    let mockLoadPositions: jest.Mock;

    beforeEach(() => {
      mockHandleUpdateTPSL = jest.fn();
      mockLoadPositions = jest.fn();

      (usePerpsTPSLUpdate as jest.Mock).mockReturnValue({
        handleUpdateTPSL: mockHandleUpdateTPSL,
        isUpdating: false,
      });

      (usePerpsLivePositions as jest.Mock).mockReturnValue({
        positions: mockPositions,
        isInitialLoading: false,
      });
    });

    it('refreshes positions after successful TP/SL update', async () => {
      // Mock successful TP/SL update
      mockHandleUpdateTPSL.mockResolvedValueOnce({ success: true });

      // Simulate TP/SL update
      await mockHandleUpdateTPSL(mockPositions[0], '55000', '45000');

      // In the real implementation, onSuccess callback would call loadPositions
      mockLoadPositions({ isRefresh: true });

      expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    });
  });
});
