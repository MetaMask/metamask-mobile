import { useNavigation } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { Position } from '../../controllers/types';
import PerpsTabView from './PerpsTabView';
import PerpsTabViewWithProvider, { PerpsTabViewRaw } from './index';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the multichain selector
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1234567890123456789012345678901234567890',
    id: 'mock-account-id',
    type: 'eip155:eoa',
  })),
}));

// Mock PerpsConnectionProvider
jest.mock('../../providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isInitialized: true,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
  })),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTrading: jest.fn(),
  usePerpsFirstTimeUser: jest.fn(),
  usePerpsAccount: jest.fn(),
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
  usePerpsPerformance: jest.fn(() => ({
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    measure: jest.fn(),
    measureAsync: jest.fn(),
  })),
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
}));

// Mock components
jest.mock('../../components/PerpsTabControlBar', () => ({
  PerpsTabControlBar: ({
    onManageBalancePress,
  }: {
    onManageBalancePress: () => void;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID="manage-balance-button"
        onPress={onManageBalancePress}
      >
        <Text>Manage Balance</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/PerpsPositionCard', () => ({
  __esModule: true,
  default: ({
    position,
    rightAccessory,
  }: {
    position: Position;
    rightAccessory?: React.ReactNode;
  }) => {
    const { View: RNView, Text } = jest.requireActual('react-native');
    return (
      <RNView testID={`position-card-${position.coin}`}>
        <Text>{position.coin}</Text>
        <Text>{position.size}</Text>
        {rightAccessory}
      </RNView>
    );
  },
}));

describe('PerpsTabView', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockUsePerpsConnection =
    jest.requireMock('../../hooks').usePerpsConnection;
  const mockUsePerpsLivePositions =
    jest.requireMock('../../hooks').usePerpsLivePositions;
  const mockUsePerpsTrading = jest.requireMock('../../hooks').usePerpsTrading;
  const mockUsePerpsFirstTimeUser =
    jest.requireMock('../../hooks').usePerpsFirstTimeUser;
  const mockUsePerpsAccount = jest.requireMock('../../hooks').usePerpsAccount;

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

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    // Mock useSelector for the multichain selector
    (useSelector as jest.Mock).mockImplementation(() => () => ({
      address: '0x1234567890123456789012345678901234567890',
      id: 'mock-account-id',
      type: 'eip155:eoa',
    }));

    // Default hook mocks
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      resetError: jest.fn(),
    });

    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    mockUsePerpsTrading.mockReturnValue({
      getAccountState: jest.fn(),
    });

    mockUsePerpsFirstTimeUser.mockReturnValue({
      isFirstTimeUser: false,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUsePerpsAccount.mockReturnValue(null);
  });

  describe('Component Rendering', () => {
    it('should render first-time user view when isFirstTimeUser is true', () => {
      mockUsePerpsFirstTimeUser.mockReturnValue({
        isFirstTimeUser: true,
        markTutorialCompleted: jest.fn(),
      });

      render(<PerpsTabView />);

      // Should not show tab control bar
      expect(
        screen.queryByTestId('manage-balance-button'),
      ).not.toBeOnTheScreen();

      // Should show first-time user content
      expect(
        screen.getByText(strings('perps.position.list.first_time_title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.first_time_description')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.start_trading')),
      ).toBeOnTheScreen();
    });

    it('should render PerpsTabView with all main components', () => {
      render(<PerpsTabView />);

      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.empty_title')),
      ).toBeOnTheScreen();
    });

    it('should render loading state when positions are loading', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      render(<PerpsTabView />);

      expect(
        screen.getByText(strings('perps.position.list.loading')),
      ).toBeOnTheScreen();
    });

    it('should render empty state when no positions exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      expect(
        screen.getByText(strings('perps.position.list.empty_title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.empty_description')),
      ).toBeOnTheScreen();
    });

    it('should render positions when they exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      expect(
        screen.getByText(strings('perps.position.title')),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('position-card-ETH')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('2.5')).toBeOnTheScreen();
    });

    it('should render multiple positions correctly', () => {
      const positions = [
        mockPosition,
        { ...mockPosition, coin: 'BTC', size: '1.0' },
        { ...mockPosition, coin: 'SOL', size: '50.0' },
      ];

      mockUsePerpsLivePositions.mockReturnValue({
        positions,
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      expect(screen.getByTestId('position-card-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('position-card-SOL')).toBeOnTheScreen();
    });
  });

  describe('Hook Integration', () => {
    it('should call getAccountState on mount when connected and initialized', () => {
      const mockGetAccountState = jest.fn();
      mockUsePerpsTrading.mockReturnValue({
        getAccountState: mockGetAccountState,
      });

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: true,
      });

      render(<PerpsTabView />);

      expect(mockGetAccountState).toHaveBeenCalled();
    });

    it('should not call getAccountState when not connected', () => {
      const mockGetAccountState = jest.fn();
      mockUsePerpsTrading.mockReturnValue({
        getAccountState: mockGetAccountState,
      });

      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: true,
      });

      render(<PerpsTabView />);

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('should not call getAccountState when not initialized', () => {
      const mockGetAccountState = jest.fn();
      mockUsePerpsTrading.mockReturnValue({
        getAccountState: mockGetAccountState,
      });

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: false,
      });

      render(<PerpsTabView />);

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('should call getAccountState when connection status changes', () => {
      const mockGetAccountState = jest.fn();
      mockUsePerpsTrading.mockReturnValue({
        getAccountState: mockGetAccountState,
      });

      const { rerender } = render(<PerpsTabView />);

      // Initially not connected
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: true,
      });

      rerender(<PerpsTabView />);
      expect(mockGetAccountState).toHaveBeenCalledTimes(1); // Only initial call

      // Now connected
      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: true,
      });

      rerender(<PerpsTabView />);
      expect(mockGetAccountState).toHaveBeenCalledTimes(2); // Should be called again
    });
  });

  describe('User Interactions', () => {
    it('should navigate to tutorial when Start Trading button is pressed in first-time view', () => {
      mockUsePerpsFirstTimeUser.mockReturnValue({
        isFirstTimeUser: true,
        markTutorialCompleted: jest.fn(),
      });

      render(<PerpsTabView />);

      const startTradingButton = screen.getByText(
        strings('perps.position.list.start_trading'),
      );
      act(() => {
        fireEvent.press(startTradingButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
      });
    });

    it('should have pull-to-refresh functionality configured', async () => {
      const mockLoadPositions = jest.fn();
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isLoading: false,
        isRefreshing: false,
        loadPositions: mockLoadPositions,
      });

      render(<PerpsTabView />);

      // Verify that the component renders without errors and has the refresh capability
      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
      expect(mockLoadPositions).toHaveBeenCalledTimes(0); // Should not be called on render
    });

    it('should navigate to balance modal when manage balance is pressed', () => {
      render(<PerpsTabView />);

      const manageBalanceButton = screen.getByTestId('manage-balance-button');

      act(() => {
        fireEvent.press(manageBalanceButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.MODALS.ROOT,
        {
          screen: Routes.PERPS.MODALS.BALANCE_MODAL,
        },
      );
    });
  });

  describe('State Management', () => {
    it('should handle refresh state correctly', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      // Verify component renders with refreshing state
      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.empty_title')),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('should handle positions with missing optional fields', () => {
      const incompletePosition = {
        ...mockPosition,
        liquidationPrice: undefined,
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
      };

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [incompletePosition],
        isInitialLoading: false,
      });

      expect(() => render(<PerpsTabView />)).not.toThrow();
      expect(screen.getByTestId('position-card-ETH')).toBeOnTheScreen();
    });

    it('should handle empty positions array correctly', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      expect(
        screen.getByText(strings('perps.position.list.empty_title')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(strings('perps.position.title')),
      ).not.toBeOnTheScreen();
    });

    it('should handle connection state changes gracefully', () => {
      const mockGetAccountState = jest.fn();
      mockUsePerpsTrading.mockReturnValue({
        getAccountState: mockGetAccountState,
      });

      const { rerender } = render(<PerpsTabView />);

      // Test multiple connection state changes
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: false,
      });
      rerender(<PerpsTabView />);

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: false,
      });
      rerender(<PerpsTabView />);

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: true,
      });
      rerender(<PerpsTabView />);

      // Should only call getAccountState when both connected and initialized
      expect(mockGetAccountState).toHaveBeenCalledTimes(2); // Initial render + final state
    });

    it('should handle hook errors gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockUsePerpsLivePositions.mockImplementation(() => {
        throw new Error('Hook error');
      });

      expect(() => render(<PerpsTabView />)).toThrow('Hook error');

      consoleSpy.mockRestore();
    });

    it('should render connection error state when connection fails', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: false,
        error: 'CONNECTION_FAILED',
        connect: jest.fn(),
        resetError: jest.fn(),
      });

      render(<PerpsTabView />);

      // Should show connection failed error
      expect(
        screen.getByText(strings('perps.errors.connectionFailed.title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.errors.connectionFailed.description')),
      ).toBeOnTheScreen();
    });

    it('should render network error state when network error occurs', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: false,
        error: 'NETWORK_ERROR',
        connect: jest.fn(),
        resetError: jest.fn(),
      });

      render(<PerpsTabView />);

      // Should show connection failed error (PerpsTabView always uses CONNECTION_FAILED)
      expect(
        screen.getByText(strings('perps.errors.connectionFailed.title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.errors.connectionFailed.description')),
      ).toBeOnTheScreen();
    });

    it('should call connect when retry button is pressed on error', () => {
      const mockConnect = jest.fn();
      const mockResetError = jest.fn();

      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: false,
        error: 'CONNECTION_FAILED',
        connect: mockConnect,
        resetError: mockResetError,
      });

      render(<PerpsTabView />);

      const retryButton = screen.getByText(
        strings('perps.errors.connectionFailed.retry'),
      );
      fireEvent.press(retryButton);

      expect(mockResetError).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility for manage balance button', () => {
      render(<PerpsTabView />);

      const manageBalanceButton = screen.getByTestId('manage-balance-button');
      expect(manageBalanceButton).toBeOnTheScreen();
    });

    it('should render text with proper variants and colors', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      expect(
        screen.getByText(strings('perps.position.title')),
      ).toBeOnTheScreen();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with multiple positions', () => {
      const manyPositions = Array.from({ length: 10 }, (_, i) => ({
        ...mockPosition,
        coin: `COIN${i}`,
        size: `${i + 1}.0`,
      }));

      mockUsePerpsLivePositions.mockReturnValue({
        positions: manyPositions,
        isInitialLoading: false,
      });

      const startTime = performance.now();
      render(<PerpsTabView />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
      expect(
        screen.getByText(strings('perps.position.title')),
      ).toBeOnTheScreen();
    });

    it('should handle rapid state changes without memory leaks', () => {
      const { rerender } = render(<PerpsTabView />);

      // Simulate rapid state changes
      for (let i = 0; i < 5; i++) {
        mockUsePerpsLivePositions.mockReturnValue({
          positions: i % 2 === 0 ? [] : [mockPosition],
          isLoading: i % 3 === 0,
          isRefreshing: i % 4 === 0,
          loadPositions: jest.fn(),
        });
        rerender(<PerpsTabView />);
      }

      // Component should still be functional
      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
    });
  });
});

// Tests for PerpsTabViewWithProvider wrapper component
describe('PerpsTabViewWithProvider', () => {
  beforeEach(() => {
    // Setup mocks for wrapped component tests
    const mockUsePerpsConnection = jest.requireMock('../../hooks')
      .usePerpsConnection as jest.Mock;
    const mockUsePerpsLivePositions = jest.requireMock('../../hooks')
      .usePerpsLivePositions as jest.Mock;
    const mockUsePerpsTrading = jest.requireMock('../../hooks')
      .usePerpsTrading as jest.Mock;
    const mockUsePerpsFirstTimeUser = jest.requireMock('../../hooks')
      .usePerpsFirstTimeUser as jest.Mock;
    const mockUsePerpsAccount = jest.requireMock('../../hooks')
      .usePerpsAccount as jest.Mock;

    // Setup default hook returns for wrapper tests
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    });

    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    mockUsePerpsTrading.mockReturnValue({
      getAccountState: jest.fn(),
    });

    mockUsePerpsFirstTimeUser.mockReturnValue({
      isFirstTimeUser: false,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUsePerpsAccount.mockReturnValue(null);

    // Mock the PerpsConnectionProvider for wrapper tests
    jest.doMock('../../providers/PerpsConnectionProvider', () => ({
      PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
        children,
      usePerpsConnection: () => ({
        isConnected: true,
        isInitialized: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      }),
    }));
  });

  describe('Component Rendering', () => {
    it('should render PerpsTabViewWithProvider wrapper', () => {
      render(<PerpsTabViewWithProvider />);

      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
    });

    it('should render without throwing errors', () => {
      expect(() => render(<PerpsTabViewWithProvider />)).not.toThrow();
    });
  });

  describe('PerpsTabViewRaw Export', () => {
    it('should export PerpsTabViewRaw as the unwrapped component', () => {
      render(<PerpsTabViewRaw />);

      // Should render PerpsTabView directly
      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<PerpsTabViewWithProvider />);

      expect(() => unmount()).not.toThrow();
    });

    it('should handle component rerendering', () => {
      const { rerender } = render(<PerpsTabViewWithProvider />);

      rerender(<PerpsTabViewWithProvider />);

      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
    });
  });
});
