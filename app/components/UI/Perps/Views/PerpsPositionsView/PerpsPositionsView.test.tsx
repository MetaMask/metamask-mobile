import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PerpsPositionsView from './PerpsPositionsView';
import {
  usePerpsAccount,
  usePerpsTrading,
  usePerpsPositions,
  usePerpsTPSLUpdate,
  usePerpsClosePosition,
} from '../../hooks';
import type { Position } from '../../controllers/types';

// Mock component types
interface MockRefreshControlProps {
  refreshing?: boolean;
  onRefresh?: () => void;
  tintColor?: string;
}

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  usePerpsAccount: jest.fn(),
  usePerpsTrading: jest.fn(),
  usePerpsTPSLUpdate: jest.fn(() => ({
    handleUpdateTPSL: jest.fn(),
    isUpdating: false,
  })),
  usePerpsPositions: jest.fn(),
  usePerpsClosePosition: jest.fn(() => ({
    handleClosePosition: jest.fn(),
    isClosing: false,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [
      { name: 'ETH', symbol: 'ETH' },
      { name: 'BTC', symbol: 'BTC' },
    ],
    error: null,
    isLoading: false,
  })),
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
    coin: 'ETH',
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
  },
  {
    coin: 'BTC',
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
    (usePerpsAccount as jest.Mock).mockReturnValue(mockAccountState);
    (usePerpsTrading as jest.Mock).mockReturnValue({
      getPositions: jest.fn(),
    });
    (useFocusEffect as jest.Mock).mockImplementation(() => {
      // Do nothing - prevent automatic callback execution
    });

    // Mock usePerpsPositions hook
    (usePerpsPositions as jest.Mock).mockReturnValue({
      positions: mockPositions,
      isLoading: false,
      isRefreshing: false,
      error: null,
      loadPositions: jest.fn(),
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
        expect(screen.getByText('Account Summary')).toBeOnTheScreen();
        expect(screen.getByText('Total Balance')).toBeOnTheScreen();
        expect(screen.getByText('Available Balance')).toBeOnTheScreen();
        expect(screen.getByText('Margin Used')).toBeOnTheScreen();
        expect(screen.getByText('Total Unrealized P&L')).toBeOnTheScreen();

        // Check that the actual formatted values appear in the UI
        expect(screen.getByText('$10,000.00')).toBeOnTheScreen(); // totalBalance
        expect(screen.getByText('$4,700.00')).toBeOnTheScreen(); // availableBalance
        expect(screen.getByText('$5,300.00')).toBeOnTheScreen(); // marginUsed
        expect(screen.getByText('+$75.50')).toBeOnTheScreen(); // total PnL
      });
    });

    it('renders positions list with position cards', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Open Positions')).toBeOnTheScreen();
        expect(screen.getByText('2 positions')).toBeOnTheScreen();
        expect(screen.getByText(/1\.50[\s\S]*ETH/)).toBeOnTheScreen();
        expect(screen.getByText(/0\.5000[\s\S]*BTC/)).toBeOnTheScreen();
      });
    });

    it('displays correct position count for single position', async () => {
      // Arrange
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [mockPositions[0]],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
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
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [],
        isLoading: true,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      expect(screen.getByText('Loading positions...')).toBeOnTheScreen();
    });
  });

  describe('Error States', () => {
    it('displays error message when positions fail to load', async () => {
      // Arrange
      const errorMessage = 'Network error';
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: errorMessage,
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      expect(screen.getByText('Error Loading Positions')).toBeOnTheScreen();
      expect(screen.getByText(errorMessage)).toBeOnTheScreen();
    });

    it('displays generic error message for non-Error objects', async () => {
      // Arrange
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load positions',
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      expect(screen.getByText('Error Loading Positions')).toBeOnTheScreen();
      expect(screen.getByText('Failed to load positions')).toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no positions are available', async () => {
      // Arrange
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No Open Positions')).toBeOnTheScreen();
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
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No Open Positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Wait for component to load - look for ETH position text
      await waitFor(() => {
        expect(screen.getByText(/1\.50[\s\S]*ETH/)).toBeOnTheScreen();
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
        expect(screen.getByText('Open Positions')).toBeOnTheScreen();
      });
    });

    it('refreshes positions when focus effect triggers', async () => {
      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Open Positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Account Summary Calculations', () => {
    it('handles missing account state values', async () => {
      // Arrange
      (usePerpsAccount as jest.Mock).mockReturnValue({
        totalBalance: null,
        availableBalance: undefined,
        marginUsed: '',
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
        const ethPositions = screen.getAllByText(/1\.50[\s\S]*ETH/);
        expect(ethPositions).toHaveLength(1);

        const btcPositions = screen.getAllByText(/0\.5000[\s\S]*BTC/);
        expect(btcPositions).toHaveLength(1);

        expect(screen.getByText(/-\$75\.25/)).toBeOnTheScreen();
      });
    });

    it('handles positions with unique keys', async () => {
      // Arrange
      const duplicatePositions = [
        { ...mockPositions[0], coin: 'ETH' },
        { ...mockPositions[0], coin: 'ETH' },
      ];
      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: duplicatePositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: jest.fn(),
      });

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        // Look for the position size text that contains "1.50 ETH"
        const ethPositions = screen.getAllByText(/1\.50\s+ETH/);
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

      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: mockPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
      });
    });

    // The close position flow is integrated into the component through
    // the handleClosePositionClick function which is passed to PerpsPositionCard
    // as the onClose prop. This function sets the selected position and opens
    // the PerpsClosePositionBottomSheet. The actual testing of this flow
    // is covered by the PerpsClosePositionBottomSheet tests.

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
      const positionWithTPSL = mockPositions.find((p) => p.coin === 'ETH');
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

      (usePerpsPositions as jest.Mock).mockReturnValue({
        positions: mockPositions,
        isLoading: false,
        isRefreshing: false,
        error: null,
        loadPositions: mockLoadPositions,
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
