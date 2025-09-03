/* eslint-disable import/no-namespace */
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import * as ComponentLibraryHooks from '../../../../../component-library/hooks';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import * as PerpsHooks from '../../hooks';
import PerpsTabControlBar from './PerpsTabControlBar';

// Mock dependencies
jest.mock('../../providers/PerpsStreamManager');
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      wrapper: {},
      balanceContainer: {},
      titleText: {},
      balanceText: {},
      arrowContainer: {},
    },
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsTrading: jest.fn(),
  useColorPulseAnimation: jest.fn(),
  useBalanceComparison: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      totalBalance: '10000.00',
      availableBalance: '1000.50',
      marginUsed: '9000.00',
      unrealizedPnl: '100.50',
      returnOnEquity: '0.15',
    },
    isInitialLoading: false,
  })),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn(
    (balance: string) => `$${parseFloat(balance || '0').toFixed(2)}`,
  ),
  formatPnl: jest.fn((value) => {
    const num = parseFloat(value);
    return num >= 0
      ? `+$${Math.abs(num).toFixed(2)}`
      : `-$${Math.abs(num).toFixed(2)}`;
  }),
  formatPercentage: jest.fn((value) => `${parseFloat(value).toFixed(2)}%`),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.available_balance': 'Available Balance',
      'perps.position.account.unrealized_pnl': 'Unrealized P&L',
    };
    return translations[key] || key;
  }),
}));

// Mock Animated.Value and animation methods
const createMockAnimatedValue = () => ({
  setValue: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  stopAnimation: jest.fn(),
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => createMockAnimatedValue()),
      timing: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
      })),
      View: RN.Animated.View,
    },
  };
});

describe('PerpsTabControlBar', () => {
  // Helper function to get TouchableOpacity
  const getTouchableOpacity = () => {
    const balanceText = screen.queryByText('Available Balance');
    if (!balanceText) {
      throw new Error('Available Balance text not found');
    }
    const touchableOpacity = balanceText.parent?.parent;
    if (!touchableOpacity) {
      throw new Error('TouchableOpacity not found');
    }
    return touchableOpacity;
  };

  // Mock implementations
  // Note: getAccountState is no longer used - component uses live subscriptions
  const mockStartPulseAnimation = jest.fn();
  const mockStopAnimation = jest.fn();
  const mockCompareAndUpdateBalance = jest.fn();
  const mockOnManageBalancePress = jest.fn();

  // Default mock return values
  const defaultAccountState = {
    totalBalance: '1000.50',
    availableBalance: '800.25',
    marginUsed: '200.25',
    unrealizedPnl: '50.75',
  };

  const defaultAnimatedStyle = {
    opacity: new Animated.Value(1),
    backgroundColor: 'transparent',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock timer functions as spies
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearInterval');

    // Setup default mock implementations
    jest
      .mocked(jest.requireMock('../../hooks').usePerpsTrading)
      .mockReturnValue({
        placeOrder: jest.fn(),
        cancelOrder: jest.fn(),
        closePosition: jest.fn(),
        getMarkets: jest.fn(),
        getPositions: jest.fn(),
        // getAccountState is no longer used - using live subscriptions
        subscribeToPrices: jest.fn(),
        subscribeToOrderFills: jest.fn(),
        depositWithConfirmation: jest.fn(),
        clearDepositResult: jest.fn(),
      });

    jest
      .mocked(jest.requireMock('../../hooks').useColorPulseAnimation)
      .mockReturnValue({
        getAnimatedStyle: defaultAnimatedStyle,
        startPulseAnimation: mockStartPulseAnimation,
        stopAnimation: mockStopAnimation,
      });

    jest
      .mocked(jest.requireMock('../../hooks').useBalanceComparison)
      .mockReturnValue({
        previousBalance: '',
        compareAndUpdateBalance: mockCompareAndUpdateBalance,
        resetBalance: jest.fn(),
      });

    // Default successful responses
    // Default mock for usePerpsLiveAccount is set in the mock module above

    mockCompareAndUpdateBalance.mockReturnValue('increase');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders correctly with all elements when no positions or orders', async () => {
      // Mock usePerpsLiveAccount to return account with balance
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('$800.25')).toBeOnTheScreen();

      // PnL pill should not be rendered when no positions or orders
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();

      // Find TouchableOpacity by its content
      const touchableOpacity =
        screen.getByText('Available Balance').parent?.parent;
      expect(touchableOpacity).toBeTruthy();
    });

    it('renders both balance and PnL pills when has positions', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions hasOrders={false} />);

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('$800.25')).toBeOnTheScreen();
      expect(screen.getByText('+$50.75 (0.00%)')).toBeOnTheScreen(); // Formatted PnL
    });

    it('renders both balance and PnL pills when has orders', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders />);

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides balance pill when balance is zero and no positions/orders', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: { ...defaultAccountState, availableBalance: '0.00' },
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();
    });

    it('shows balance pill when balance is zero but has positions', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: { ...defaultAccountState, availableBalance: '0.00' },
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions hasOrders={false} />);

      expect(screen.getByText('Available Balance')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('displays formatted balance when data is loaded', async () => {
      // Mock usePerpsLiveAccount to return account data
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // Should display the available balance from account state
      expect(screen.getByText('$800.25')).toBeOnTheScreen();
    });

    it('renders without onManageBalancePress prop', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      expect(() =>
        render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />),
      ).not.toThrow();

      // TouchableOpacity should be present
      const touchableOpacity = getTouchableOpacity();
      expect(touchableOpacity).toBeTruthy();
    });

    it('applies animated styles to balance text', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // Verify that the useColorPulseAnimation hook is called
      expect(PerpsHooks.useColorPulseAnimation).toHaveBeenCalled();
    });
  });

  describe('Balance Loading and Updates', () => {
    it('subscribes to live account data on mount', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // Verify hook was called to subscribe to live data
      expect(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      ).toHaveBeenCalledWith({ throttleMs: 1000 });
    });

    it('triggers pulse animation on balance change', async () => {
      // Start with an initial balance
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );

      // First render with initial balance - this sets the previousBalanceRef
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '900.00' },
        isInitialLoading: false,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Clear previous mock calls
      mockCompareAndUpdateBalance.mockClear();
      mockStartPulseAnimation.mockClear();

      // Now change the balance - this should trigger animation
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '1000.50' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // Wait for useEffect to run
      await waitFor(() => {
        // Animation should trigger on the balance change
        expect(mockCompareAndUpdateBalance).toHaveBeenCalledWith('1000.50');
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('increase');
      });
    });

    it('handles balance comparison for decrease', async () => {
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );

      // First render with higher balance - sets previousBalanceRef
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '1200.00' },
        isInitialLoading: false,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Clear previous mock calls and set decrease return
      mockCompareAndUpdateBalance.mockClear();
      mockStartPulseAnimation.mockClear();
      mockCompareAndUpdateBalance.mockReturnValue('decrease');

      // Now render with lower balance
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '800.00' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      await waitFor(() => {
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('decrease');
      });
    });

    it('does not trigger animation for same balance', () => {
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );

      // Render with initial balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: { ...defaultAccountState, availableBalance: '1000.50' },
        isInitialLoading: false,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Clear mock calls
      mockStartPulseAnimation.mockClear();
      mockCompareAndUpdateBalance.mockClear();

      // Render again with same balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: { ...defaultAccountState, availableBalance: '1000.50' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // Should not call animation functions for same balance
      expect(mockStartPulseAnimation).not.toHaveBeenCalled();
    });
  });

  // WebSocket subscription tests removed - usePerpsLivePositions handles subscriptions internally

  describe('Press Handler', () => {
    it('calls onManageBalancePress when pressed', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(
        <PerpsTabControlBar
          onManageBalancePress={mockOnManageBalancePress}
          hasPositions={false}
          hasOrders={false}
        />,
      );

      const touchableOpacity = getTouchableOpacity();
      fireEvent.press(touchableOpacity);

      expect(mockOnManageBalancePress).toHaveBeenCalled();
    });

    it('does not throw when pressed without onManageBalancePress', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      const touchableOpacity = getTouchableOpacity();
      expect(() => fireEvent.press(touchableOpacity)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles null account data gracefully', async () => {
      // Mock hook to return null account
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({ account: null, isInitialLoading: false });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // With null account and no positions/orders, balance pill should be hidden
      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();
    });

    it('handles animation errors gracefully', async () => {
      mockStartPulseAnimation.mockImplementation(() => {
        throw new Error('Animation error');
      });

      // First render with null, then with account data
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: null,
        isInitialLoading: true,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Update with account data
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '800.25' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions hasOrders={false} />);

      // Should still update the balance even if animation fails
      await waitFor(() => {
        expect(screen.getByText('$800.25')).toBeOnTheScreen();
      });
    });

    it('logs animation errors properly', async () => {
      mockStartPulseAnimation.mockImplementation(() => {
        throw new Error('Animation error');
      });

      // Simulate balance change
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );

      // First render to set previousBalanceRef
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '500.00' },
        isInitialLoading: false,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Clear DevLogger mock
      (DevLogger.log as jest.Mock).mockClear();

      // Change balance to trigger animation
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '600.00' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      await waitFor(() => {
        expect(DevLogger.log).toHaveBeenCalledWith(
          'PerpsTabControlBar: Balance animation error:',
          expect.any(Error),
        );
      });
    });

    it('handles loading state gracefully', async () => {
      // Mock loading state
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({ account: null, isInitialLoading: true });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // During loading with no positions/orders, balance pill should be hidden
      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();
    });
  });

  describe('Cleanup and Memory Management', () => {
    // Subscription cleanup test removed - handled by usePerpsLivePositions internally

    it('stops animation on unmount', async () => {
      const { unmount } = render(<PerpsTabControlBar />);

      unmount();

      expect(mockStopAnimation).toHaveBeenCalled();
    });

    // Null subscription test removed - no longer applicable
  });

  describe('Edge Cases', () => {
    it('handles empty balance gracefully', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: {
            ...defaultAccountState,
            availableBalance: '',
          },
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // With empty balance and no positions/orders, pills should be hidden
      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();
    });

    it('handles null balance gracefully', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: {
            ...defaultAccountState,
            availableBalance: null as unknown as string,
          },
          isInitialLoading: false,
        });

      render(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      // With null balance and no positions/orders, pills should be hidden
      expect(screen.queryByText('Available Balance')).not.toBeOnTheScreen();
      expect(screen.queryByText('Unrealized P&L')).not.toBeOnTheScreen();
    });

    // Test removed - position updates handled by usePerpsLivePositions internally
  });

  describe('Integration', () => {
    it('integrates all hooks correctly', async () => {
      jest
        .mocked(jest.requireMock('../../hooks/stream').usePerpsLiveAccount)
        .mockReturnValue({
          account: defaultAccountState,
          isInitialLoading: false,
        });

      render(
        <PerpsTabControlBar
          onManageBalancePress={mockOnManageBalancePress}
          hasPositions={false}
          hasOrders={false}
        />,
      );

      // Verify all hooks are called
      // Note: usePerpsTrading is no longer used - using usePerpsLiveAccount instead
      expect(PerpsHooks.useColorPulseAnimation).toHaveBeenCalled();
      expect(PerpsHooks.useBalanceComparison).toHaveBeenCalled();
      expect(ComponentLibraryHooks.useStyles).toHaveBeenCalled();

      // Verify live account hook was called
      expect(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      ).toHaveBeenCalled();

      // Test press interaction
      const touchableOpacity = getTouchableOpacity();
      fireEvent.press(touchableOpacity);
      expect(mockOnManageBalancePress).toHaveBeenCalled();
    });

    it('passes correct parameters between hooks', async () => {
      // Mock initial state with a starting balance
      const mockUsePerpsLiveAccount = jest.mocked(
        jest.requireMock('../../hooks/stream').usePerpsLiveAccount,
      );

      // First render with initial balance - sets previousBalanceRef
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '900.00' },
        isInitialLoading: false,
      });

      const { rerender } = render(
        <PerpsTabControlBar hasPositions={false} hasOrders={false} />,
      );

      // Clear mocks
      mockCompareAndUpdateBalance.mockClear();
      mockStartPulseAnimation.mockClear();

      // Now mock with changed balance
      mockUsePerpsLiveAccount.mockReturnValueOnce({
        account: { ...defaultAccountState, availableBalance: '1000.50' },
        isInitialLoading: false,
      });

      rerender(<PerpsTabControlBar hasPositions={false} hasOrders={false} />);

      await waitFor(() => {
        expect(mockCompareAndUpdateBalance).toHaveBeenCalledWith('1000.50');
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('increase');
      });
    });
  });
});
