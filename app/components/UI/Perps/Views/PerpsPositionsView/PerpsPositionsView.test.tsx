import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PerpsPositionsView from './PerpsPositionsView';
import { usePerpsAccount, usePerpsTrading } from '../../hooks';
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

const mockGetPositions = jest.fn();
const mockPerpsTrading = {
  getPositions: mockGetPositions,
};

describe('PerpsPositionsView', () => {
  beforeEach(() => {
    // Clear only specific mocks, not all mocks to maintain stable references
    mockNavigation.goBack.mockClear();
    mockGetPositions.mockClear();
    mockGetPositions.mockResolvedValue(mockPositions);

    // Clear other mocks - DevLogger is mocked to avoid log output

    // Setup default mocks with stable references
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (usePerpsAccount as jest.Mock).mockReturnValue(mockAccountState);
    (usePerpsTrading as jest.Mock).mockReturnValue(mockPerpsTrading);
    (useFocusEffect as jest.Mock).mockImplementation(() => {
      // Do nothing - prevent automatic callback execution
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
      mockGetPositions.mockResolvedValue([mockPositions[0]]);

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
      mockGetPositions.mockRejectedValue(new Error(errorMessage));

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error Loading Positions')).toBeOnTheScreen();
        expect(screen.getByText(errorMessage)).toBeOnTheScreen();
      });
    });

    it('displays generic error message for non-Error objects', async () => {
      // Arrange
      mockGetPositions.mockRejectedValue('String error');

      // Act
      render(<PerpsPositionsView />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error Loading Positions')).toBeOnTheScreen();
        expect(screen.getByText('Failed to load positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no positions are available', async () => {
      // Arrange
      mockGetPositions.mockResolvedValue([]);

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
      mockGetPositions.mockResolvedValue(null);

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
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });
    });

    it('refreshes positions when focus effect triggers', async () => {
      // Arrange
      let focusCallback: (() => void) | undefined;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
      });

      // Act
      render(<PerpsPositionsView />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      // Trigger focus effect
      if (focusCallback) {
        focusCallback();
      }

      // Assert
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(2);
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
      mockGetPositions.mockResolvedValue(duplicatePositions);

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
});
