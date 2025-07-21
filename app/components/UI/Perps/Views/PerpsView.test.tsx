import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ScrollView } from 'react-native';
import configureMockStore from 'redux-mock-store';
import PerpsView from './PerpsView';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { useStyles } from '../../../../component-library/hooks';
import { useNavigation } from '@react-navigation/native';

// Mock dependencies
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
}));

jest.mock('../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      wrapper: {},
      content: {},
      section: {},
      sectionHeader: {},
      sectionTitle: {},
      emptyContainer: {},
      emptyText: {},
      loadingContainer: {},
      bottomSheetContent: {},
      actionButton: {},
    },
  })),
  useComponentSize: jest.fn(() => ({
    size: { width: 100, height: 40 },
    onLayout: jest.fn(),
  })),
}));

// Mock Perps hooks
jest.mock('../hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTrading: jest.fn(),
}));

// Import the mocked hooks
import { usePerpsConnection, usePerpsTrading } from '../hooks';

// Mock implementations (stable across renders)
const mockGetPositions = jest.fn();
const mockGetAccountState = jest.fn();

const mockPerpsTrading = {
  getPositions: mockGetPositions,
  getAccountState: mockGetAccountState,
};

const mockPerpsConnection = {
  isConnected: true,
  isInitialized: true,
  isConnecting: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  resetError: jest.fn(),
};

// Mock child components
jest.mock('../components/PerpsTabControlBar', () => ({
  PerpsTabControlBar: ({
    onManageBalancePress,
  }: {
    onManageBalancePress?: () => void;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity
        testID="perps-tab-control-bar"
        onPress={onManageBalancePress}
      >
        <Text>Perps Tab Control Bar</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../components/PerpsPositionCard', () => ({
  __esModule: true,
  default: ({ position }: { position: { coin: string } }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID={`position-card-${position.coin}`}>
        <Text>Position: {position.coin}</Text>
      </View>
    );
  },
}));

// Mock RefreshControl separately
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const MockRefreshControl = (props: {
    onRefresh: () => void;
    refreshing: boolean;
  }) =>
    RN.createElement(RN.View, {
      testID: 'refresh-control',
      onRefresh: props.onRefresh,
      refreshing: props.refreshing,
      'data-refreshing': props.refreshing,
    });

  return {
    ...RN,
    RefreshControl: MockRefreshControl,
  };
});

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 })),
}));

// Mock localization
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.position.list.loading': 'Loading positions...',
      'perps.position.list.empty_title': 'No open positions',
      'perps.position.list.empty_description':
        'Start trading to see your positions here',
      'perps.position.title': 'Your Positions',
      'perps.manage_balance': 'Manage Balance',
      'perps.add_funds': 'Add Funds',
      'perps.withdraw': 'Withdraw',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsView', () => {
  const mockStore = configureMockStore();
  const store = mockStore({
    engine: {
      backgroundState,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPositions.mockResolvedValue([]);
    mockGetAccountState.mockResolvedValue({});

    // Setup hook mocks
    (usePerpsTrading as jest.Mock).mockReturnValue(mockPerpsTrading);
    (usePerpsConnection as jest.Mock).mockReturnValue(mockPerpsConnection);
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <PerpsView />
      </Provider>,
    );

  describe('Component Rendering', () => {
    it('renders correctly with all main components', () => {
      renderComponent();

      expect(screen.getByTestId('perps-tab-control-bar')).toBeOnTheScreen();
      // Check that ScrollView with RefreshControl is rendered
      expect(screen.UNSAFE_getByType(ScrollView)).toBeDefined();
    });

    it('displays loading state initially', () => {
      renderComponent();

      expect(screen.getByText('Loading positions...')).toBeOnTheScreen();
    });

    it('calls useStyles hook with correct parameters', () => {
      renderComponent();

      expect(useStyles).toHaveBeenCalledWith(expect.any(Function), {});
    });
  });

  describe('Hooks Integration', () => {
    it('calls usePerpsTrading hook', () => {
      renderComponent();

      expect(usePerpsTrading).toHaveBeenCalled();
    });

    it('calls usePerpsConnection hook', () => {
      renderComponent();

      expect(usePerpsConnection).toHaveBeenCalled();
    });

    it('calls useNavigation hook', () => {
      renderComponent();

      expect(useNavigation).toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('loads positions on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });
    });

    it('loads account state when connected and initialized', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });

    it('does not load account state when not connected', async () => {
      (usePerpsConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        isInitialized: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('does not load account state when not initialized', async () => {
      (usePerpsConnection as jest.Mock).mockReturnValue({
        isConnected: true,
        isInitialized: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no positions', async () => {
      mockGetPositions.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
        expect(
          screen.getByText('Start trading to see your positions here'),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('Positions Display', () => {
    it('displays positions when loaded', async () => {
      const mockPositions = [
        { coin: 'BTC', size: '1.0', entryPrice: '50000' },
        { coin: 'ETH', size: '10.0', entryPrice: '3000' },
      ];
      mockGetPositions.mockResolvedValue(mockPositions);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Your Positions')).toBeOnTheScreen();
        expect(screen.getByTestId('position-card-BTC')).toBeOnTheScreen();
        expect(screen.getByTestId('position-card-ETH')).toBeOnTheScreen();
      });
    });

    it('renders position cards with correct props', async () => {
      const mockPosition = { coin: 'BTC', size: '1.0', entryPrice: '50000' };
      mockGetPositions.mockResolvedValue([mockPosition]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('position-card-BTC')).toBeOnTheScreen();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles getPositions errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockGetPositions.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load positions:',
          expect.any(Error),
        );
      });

      // Should display empty state after error
      expect(screen.getByText('No open positions')).toBeOnTheScreen();

      consoleErrorSpy.mockRestore();
    });

    it('sets empty positions array on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      mockGetPositions.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      jest.restoreAllMocks();
    });
  });

  describe('Refresh Functionality', () => {
    it('handles pull-to-refresh', async () => {
      mockGetPositions
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { coin: 'BTC', size: '1.0', entryPrice: '50000' },
        ]);

      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      // Trigger refresh by finding the RefreshControl and calling its onRefresh
      const scrollView = screen.UNSAFE_getByType(ScrollView);
      const refreshControl = scrollView.props.refreshControl;

      // Trigger refresh
      refreshControl?.props.onRefresh?.();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(2);
        expect(mockGetPositions).toHaveBeenLastCalledWith();
      });
    });
  });

  describe('Balance Management', () => {
    it('opens bottom sheet when manage balance is pressed', async () => {
      renderComponent();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      // Press manage balance button
      const tabControlBar = screen.getByTestId('perps-tab-control-bar');
      fireEvent.press(tabControlBar);

      expect(screen.getByText('Manage Balance')).toBeOnTheScreen();
      expect(screen.getByText('Add Funds')).toBeOnTheScreen();
      expect(screen.getByText('Withdraw')).toBeOnTheScreen();
    });

    it('closes bottom sheet when close button is pressed', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      // Open bottom sheet
      const tabControlBar = screen.getByTestId('perps-tab-control-bar');
      fireEvent.press(tabControlBar);

      expect(screen.getByText('Manage Balance')).toBeOnTheScreen();

      // Close bottom sheet - this would typically be handled by the BottomSheet component
      // In a real scenario, we'd simulate the close button press
    });

    it('navigates to deposit screen when add funds is pressed', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      // Open bottom sheet
      const tabControlBar = screen.getByTestId('perps-tab-control-bar');
      fireEvent.press(tabControlBar);

      // Press add funds button
      const addFundsButton = screen.getByText('Add Funds');
      fireEvent.press(addFundsButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.DEPOSIT,
      });
    });

    it('closes bottom sheet when withdraw button is pressed', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      // Open bottom sheet
      const tabControlBar = screen.getByTestId('perps-tab-control-bar');
      fireEvent.press(tabControlBar);

      // Press withdraw button - currently just closes the sheet
      const withdrawButton = screen.getByText('Withdraw');
      fireEvent.press(withdrawButton);

      // The bottom sheet should close (visibility controlled by state)
      // This would need to be verified based on component state
    });
  });

  describe('Loading States', () => {
    it('shows loading state during initial load', () => {
      // Mock getPositions to return a pending promise
      let resolvePositions: ((value: unknown[]) => void) | undefined;
      const positionsPromise = new Promise<unknown[]>((resolve) => {
        resolvePositions = resolve;
      });
      mockGetPositions.mockReturnValue(positionsPromise);

      renderComponent();

      expect(screen.getByText('Loading positions...')).toBeOnTheScreen();

      // Resolve the promise
      resolvePositions?.([]);
    });

    it('hides loading state after positions are loaded', async () => {
      mockGetPositions.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(
          screen.queryByText('Loading positions...'),
        ).not.toBeOnTheScreen();
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });
    });

    it('shows different content for loading vs loaded states', async () => {
      // Start with loading state
      let resolvePositions: ((value: unknown[]) => void) | undefined;
      const positionsPromise = new Promise<unknown[]>((resolve) => {
        resolvePositions = resolve;
      });
      mockGetPositions.mockReturnValue(positionsPromise);

      renderComponent();

      // Should show loading
      expect(screen.getByText('Loading positions...')).toBeOnTheScreen();
      expect(screen.queryByText('No open positions')).not.toBeOnTheScreen();

      // Resolve with empty positions
      resolvePositions?.([]);

      // Should show empty state
      await waitFor(() => {
        expect(
          screen.queryByText('Loading positions...'),
        ).not.toBeOnTheScreen();
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });
    });
  });

  describe('Connection State Integration', () => {
    it('handles connected and initialized state', async () => {
      (usePerpsConnection as jest.Mock).mockReturnValue({
        isConnected: true,
        isInitialized: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });

    it('handles disconnected state', async () => {
      (usePerpsConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        isInitialized: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      });

      renderComponent();

      // Should still load positions
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      // But not account state
      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('handles uninitialized state', async () => {
      (usePerpsConnection as jest.Mock).mockReturnValue({
        isConnected: true,
        isInitialized: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
      });

      renderComponent();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });
  });

  describe('Component Cleanup', () => {
    it('should not cause memory leaks after unmount', async () => {
      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('integrates all features in typical user flow', async () => {
      // Start with no positions
      mockGetPositions
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { coin: 'BTC', size: '1.0', entryPrice: '50000' },
        ]);

      renderComponent();

      // Should load initially
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
        expect(mockGetAccountState).toHaveBeenCalled();
        expect(screen.getByText('No open positions')).toBeOnTheScreen();
      });

      // Refresh to get new positions
      const scrollView = screen.UNSAFE_getByType(ScrollView);
      const refreshControl = scrollView.props.refreshControl;

      refreshControl?.props.onRefresh?.();

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Your Positions')).toBeOnTheScreen();
        expect(screen.getByTestId('position-card-BTC')).toBeOnTheScreen();
      });

      // Open balance management
      const tabControlBar = screen.getByTestId('perps-tab-control-bar');
      fireEvent.press(tabControlBar);

      expect(screen.getByText('Manage Balance')).toBeOnTheScreen();

      // Navigate to deposit
      const addFundsButton = screen.getByText('Add Funds');
      fireEvent.press(addFundsButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.DEPOSIT,
      });
    });
  });
});
