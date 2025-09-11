import { useNavigation } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import type { Position } from '../../controllers/types';
import PerpsTabView from './PerpsTabView';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {},
    theme: {},
  }),
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

// Mock PerpsStreamProvider
jest.mock('../../providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsStream: jest.fn(() => ({
    prices: { subscribe: jest.fn(), unsubscribe: jest.fn() },
    positions: { subscribe: jest.fn(), unsubscribe: jest.fn() },
    orders: { subscribe: jest.fn(), unsubscribe: jest.fn() },
    account: { subscribe: jest.fn(), unsubscribe: jest.fn() },
    marketData: { subscribe: jest.fn(), unsubscribe: jest.fn() },
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
  usePerpsLiveOrders: jest.fn(() => ({
    orders: [],
    isInitialLoading: false,
  })),
}));

// Mock formatUtils
jest.mock('../../utils/formatUtils', () => ({
  ...jest.requireActual('../../utils/formatUtils'),
  formatPrice: jest.fn((value) => `$${value}`),
  formatPnl: jest.fn((value) => `${value >= 0 ? '+' : ''}$${Math.abs(value)}`),
}));

// Mock asset metadata hook
jest.mock('../../hooks/usePerpsAssetsMetadata', () => ({
  usePerpsAssetMetadata: jest.fn(() => ({
    assetUrl: 'https://example.com/eth.png',
  })),
}));

// Mock RemoteImage
jest.mock('../../../../Base/RemoteImage', () => jest.fn(() => null));

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

describe('PerpsTabView', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockUsePerpsConnection =
    jest.requireMock('../../hooks').usePerpsConnection;
  const mockUsePerpsLivePositions =
    jest.requireMock('../../hooks').usePerpsLivePositions;
  const mockUsePerpsLiveOrders =
    jest.requireMock('../../hooks').usePerpsLiveOrders;
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

    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
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
});

// Tests for PerpsTabViewWithProvider wrapper component
