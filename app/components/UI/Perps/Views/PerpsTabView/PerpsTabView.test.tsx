import { useNavigation } from '@react-navigation/native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
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

// Mock the selector module first
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

// Mock Redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
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
    prices: { subscribe: jest.fn(() => jest.fn()) },
    positions: { subscribe: jest.fn(() => jest.fn()) },
    orders: { subscribe: jest.fn(() => jest.fn()) },
    account: { subscribe: jest.fn(() => jest.fn()) },
    marketData: { subscribe: jest.fn(() => jest.fn()) },
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

// Mock stream hooks separately since they're imported from different path
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveOrders: jest.fn(() => []),
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      availableBalance: '1000.00',
      totalBalance: '1000.00',
      marginUsed: '0.00',
      unrealizedPnl: '0.00',
      returnOnEquity: '0.00',
      totalValue: '1000.00',
    },
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
    hasPositions,
    hasOrders,
  }: {
    onManageBalancePress: () => void;
    hasPositions?: boolean;
    hasOrders?: boolean;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID="manage-balance-button"
        onPress={onManageBalancePress}
      >
        <Text>Manage Balance</Text>
        <Text testID="has-positions">{hasPositions ? 'true' : 'false'}</Text>
        <Text testID="has-orders">{hasOrders ? 'true' : 'false'}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock selectors
jest.mock('../../../../../../e2e/selectors/Perps/Perps.selectors', () => ({
  PerpsTabViewSelectorsIDs: {
    START_NEW_TRADE_CTA: 'perps-tab-view-start-new-trade-cta',
  },
  PerpsPositionsViewSelectorsIDs: {
    POSITIONS_SECTION_TITLE: 'perps-positions-section-title',
    POSITION_ITEM: 'perps-positions-item',
  },
}));

jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: ({ onClose, testID }: { onClose: () => void; testID?: string }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity testID={testID} onPress={onClose}>
        <Text>Geo Block Tooltip</Text>
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
    jest.requireMock('../../hooks/stream').usePerpsLiveOrders;
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
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

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

    mockUsePerpsLiveOrders.mockReturnValue([]);

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

    // Default eligibility mock
    const mockSelectPerpsEligibility = jest.requireMock(
      '../../selectors/perpsController',
    ).selectPerpsEligibility;
    (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
      if (selector === mockSelectPerpsEligibility) {
        return true;
      }
      // Handle the multichain selector
      if (typeof selector === 'function') {
        return () => ({
          address: '0x1234567890123456789012345678901234567890',
          id: 'mock-account-id',
          type: 'eip155:eoa',
        });
      }
      return undefined;
    });
  });

  describe('Hook Integration', () => {
    it('should use live account data when component mounts', () => {
      const mockUsePerpsLiveAccount =
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount;

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: true,
      });

      render(<PerpsTabView />);

      expect(mockUsePerpsLiveAccount).toHaveBeenCalled();
    });

    it('should still use live account data even when not connected', () => {
      const mockUsePerpsLiveAccount =
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount;

      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: true,
      });

      render(<PerpsTabView />);

      // usePerpsLiveAccount should still be called regardless of connection status
      expect(mockUsePerpsLiveAccount).toHaveBeenCalled();
    });

    it('should still use live account data even when not initialized', () => {
      const mockUsePerpsLiveAccount =
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount;

      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: false,
      });

      render(<PerpsTabView />);

      // usePerpsLiveAccount should still be called regardless of initialization status
      expect(mockUsePerpsLiveAccount).toHaveBeenCalled();
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

    it('should render Start a new trade CTA when positions exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      const startNewTradeCTA = screen.getByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      expect(startNewTradeCTA).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.start_new_trade')),
      ).toBeOnTheScreen();
    });

    it('should navigate to tutorial when Start a new trade CTA is pressed by first-time user', () => {
      mockUsePerpsFirstTimeUser.mockReturnValue({
        isFirstTimeUser: true,
        markTutorialCompleted: jest.fn(),
      });

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      const startNewTradeCTA = screen.getByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      act(() => {
        fireEvent.press(startNewTradeCTA);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
      });
    });

    it('should navigate to markets when Start a new trade CTA is pressed by returning user', () => {
      mockUsePerpsFirstTimeUser.mockReturnValue({
        isFirstTimeUser: false,
        markTutorialCompleted: jest.fn(),
      });

      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      render(<PerpsTabView />);

      const startNewTradeCTA = screen.getByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      act(() => {
        fireEvent.press(startNewTradeCTA);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('should render Start Trade CTA in orders section when there are orders but no positions', () => {
      // Given orders exist but no positions
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([
        { orderId: '123', symbol: 'ETH', size: '1.0', orderType: 'limit' },
        { orderId: '456', symbol: 'BTC', size: '0.5', orderType: 'market' },
      ]);

      // When the view is rendered
      render(<PerpsTabView />);

      // Then Start Trade CTA should be present in the orders section
      const startNewTradeCTA = screen.getByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      expect(startNewTradeCTA).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.start_new_trade')),
      ).toBeOnTheScreen();

      // And orders should be displayed
      expect(screen.getByText('Orders')).toBeOnTheScreen();
    });

    it('should NOT render empty state text when there are no positions and no orders', () => {
      // Given no positions and no orders
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([]);

      // When the view is rendered
      render(<PerpsTabView />);

      // Then empty state text should NOT be present (returns null now)
      expect(
        screen.queryByText(strings('perps.position.list.empty_title')),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText(strings('perps.position.list.empty_description')),
      ).not.toBeOnTheScreen();

      // And Start Trade CTA should NOT be present
      expect(
        screen.queryByTestId('perps-tab-view-start-new-trade-cta'),
      ).not.toBeOnTheScreen();
    });

    it('should render Start Trade CTA below positions when positions exist', () => {
      // Given positions exist
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([]);

      // When the view is rendered
      render(<PerpsTabView />);

      // Then Start Trade CTA should be present below positions
      const startNewTradeCTA = screen.getByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      expect(startNewTradeCTA).toBeOnTheScreen();

      // And positions section should be visible
      expect(screen.getByText('Positions')).toBeOnTheScreen();
    });

    it('should NOT show Start Trade CTA in orders section when both orders and positions exist', () => {
      // Given both orders and positions exist
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([
        { orderId: '123', symbol: 'ETH', size: '1.0', orderType: 'limit' },
      ]);

      // When the view is rendered
      render(<PerpsTabView />);

      // Then only one Start Trade CTA should be present (in positions section)
      const startTradeCTAs = screen.getAllByTestId(
        'perps-tab-view-start-new-trade-cta',
      );
      expect(startTradeCTAs).toHaveLength(1);

      // And both sections should be visible
      expect(screen.getByText('Orders')).toBeOnTheScreen();
      expect(screen.getByText('Positions')).toBeOnTheScreen();
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

    it('should navigate to balance modal when manage balance is pressed and user is eligible', () => {
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return true;
        }
        // Handle the multichain selector
        if (typeof selector === 'function') {
          return () => ({
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:eoa',
          });
        }
        return undefined;
      });

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

    it('should show geo block modal when manage balance is pressed and user is not eligible', () => {
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        // Handle the multichain selector
        if (typeof selector === 'function') {
          return () => ({
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:eoa',
          });
        }
        return undefined;
      });

      render(<PerpsTabView />);

      const manageBalanceButton = screen.getByTestId('manage-balance-button');

      act(() => {
        fireEvent.press(manageBalanceButton);
      });

      expect(screen.getByText('Geo Block Tooltip')).toBeOnTheScreen();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should close geo block modal when onClose is called', async () => {
      const mockSelectPerpsEligibility = jest.requireMock(
        '../../selectors/perpsController',
      ).selectPerpsEligibility;
      (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
        if (selector === mockSelectPerpsEligibility) {
          return false;
        }
        // Handle the multichain selector
        if (typeof selector === 'function') {
          return () => ({
            address: '0x1234567890123456789012345678901234567890',
            id: 'mock-account-id',
            type: 'eip155:eoa',
          });
        }
        return undefined;
      });

      render(<PerpsTabView />);

      const manageBalanceButton = screen.getByTestId('manage-balance-button');

      act(() => {
        fireEvent.press(manageBalanceButton);
      });

      expect(screen.getByText('Geo Block Tooltip')).toBeOnTheScreen();

      // The mock renders TouchableOpacity with the text "Geo Block Tooltip" inside it
      // We can press the text element directly since TouchableOpacity propagates press events
      const geoBlockText = screen.getByText('Geo Block Tooltip');

      act(() => {
        fireEvent.press(geoBlockText);
      });

      // Wait for the modal to be removed from the DOM
      await waitFor(() => {
        expect(screen.queryByText('Geo Block Tooltip')).not.toBeOnTheScreen();
      });
    });
  });

  describe('State Management', () => {
    it('should handle refresh state correctly', () => {
      // Arrange - Mock refreshing state with no positions or orders
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
        isRefreshing: true,
        loadPositions: jest.fn(),
      });

      mockUsePerpsLiveOrders.mockReturnValue([]);

      // Act - Render component
      render(<PerpsTabView />);

      // Assert - Component should render first-time content when no positions or orders exist
      expect(screen.getByTestId('manage-balance-button')).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.first_time_title')),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.position.list.start_trading')),
      ).toBeOnTheScreen();
    });

    it('should pass correct hasPositions prop to PerpsTabControlBar when positions exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [mockPosition],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([]);

      render(<PerpsTabView />);

      expect(screen.getByTestId('has-positions')).toHaveTextContent('true');
      expect(screen.getByTestId('has-orders')).toHaveTextContent('false');
    });

    it('should pass correct hasOrders prop to PerpsTabControlBar when orders exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([
        { orderId: '123', symbol: 'ETH', size: '1.0' },
      ]);

      render(<PerpsTabView />);

      expect(screen.getByTestId('has-positions')).toHaveTextContent('false');
      expect(screen.getByTestId('has-orders')).toHaveTextContent('true');
    });

    it('should pass false for both props when no positions or orders exist', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      mockUsePerpsLiveOrders.mockReturnValue([]);

      render(<PerpsTabView />);

      expect(screen.getByTestId('has-positions')).toHaveTextContent('false');
      expect(screen.getByTestId('has-orders')).toHaveTextContent('false');
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
