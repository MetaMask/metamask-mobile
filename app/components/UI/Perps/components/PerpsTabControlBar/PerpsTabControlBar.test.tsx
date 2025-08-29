/* eslint-disable import/no-namespace */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { Animated } from 'react-native';
import PerpsTabControlBar from './PerpsTabControlBar';
import * as PerpsHooks from '../../hooks';
import * as ComponentLibraryHooks from '../../../../../component-library/hooks';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { Position } from '../../controllers';

// Mock dependencies
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

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn(
    (balance: string) => `$${parseFloat(balance || '0').toFixed(2)}`,
  ),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
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
    const balanceText = screen.getByText('Perp account balance');
    const touchableOpacity = balanceText.parent?.parent;
    if (!touchableOpacity) {
      throw new Error('TouchableOpacity not found');
    }
    return touchableOpacity;
  };

  // Mock implementations
  const mockGetAccountState = jest.fn();
  const mockSubscribeToPositions = jest.fn();
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
        getAccountState: mockGetAccountState,
        subscribeToPrices: jest.fn(),
        subscribeToPositions: mockSubscribeToPositions,
        subscribeToOrderFills: jest.fn(),
        deposit: jest.fn(),
        getDepositRoutes: jest.fn(),
        resetDepositState: jest.fn(),
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
    mockGetAccountState.mockResolvedValue(defaultAccountState);
    mockSubscribeToPositions.mockReturnValue(() => {
      /* empty unsubscribe function */
    });

    mockCompareAndUpdateBalance.mockReturnValue('increase');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders correctly with all elements', async () => {
      render(<PerpsTabControlBar />);

      expect(screen.getByText('Perp account balance')).toBeOnTheScreen();
      expect(screen.getByText('$0.00')).toBeOnTheScreen(); // Initial balance

      // Find TouchableOpacity by its content
      const touchableOpacity = screen.getByText('Perp account balance').parent
        ?.parent;
      expect(touchableOpacity).toBeTruthy();
    });

    it('displays formatted balance when data is loaded', async () => {
      render(<PerpsTabControlBar />);

      // Wait for the initial data load
      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('$800.25')).toBeOnTheScreen();
      });
    });

    it('renders without onManageBalancePress prop', async () => {
      expect(() => render(<PerpsTabControlBar />)).not.toThrow();

      // TouchableOpacity should be present
      const touchableOpacity = getTouchableOpacity();
      expect(touchableOpacity).toBeTruthy();
    });

    it('applies animated styles to balance text', async () => {
      render(<PerpsTabControlBar />);

      // Verify that the useColorPulseAnimation hook is called
      expect(PerpsHooks.useColorPulseAnimation).toHaveBeenCalled();
    });
  });

  describe('Balance Loading and Updates', () => {
    it('calls getAccountState on initial load', async () => {
      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });

    it('triggers pulse animation on balance change', async () => {
      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockCompareAndUpdateBalance).toHaveBeenCalledWith('1000.50');
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('increase');
      });
    });

    it('handles balance comparison for decrease', async () => {
      mockCompareAndUpdateBalance.mockReturnValue('decrease');

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('decrease');
      });
    });

    it('handles balance comparison for same value', async () => {
      mockCompareAndUpdateBalance.mockReturnValue('same');

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('same');
      });
    });
  });

  describe('WebSocket Subscription and Polling', () => {
    it('subscribes to position updates on mount', async () => {
      render(<PerpsTabControlBar />);

      expect(mockSubscribeToPositions).toHaveBeenCalledWith({
        callback: expect.any(Function),
      });
    });

    it('refreshes balance when position updates are received', async () => {
      let positionCallback: ((positions: Position[]) => void) | null = null;
      mockSubscribeToPositions.mockImplementation(({ callback }) => {
        positionCallback = callback;
        return () => {
          /* empty unsubscribe function */
        };
      });

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockSubscribeToPositions).toHaveBeenCalled();
      });

      // Simulate position update
      await act(async () => {
        positionCallback?.([
          { id: '1', symbol: 'BTC' },
        ] as unknown as Position[]);
      });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(2); // Initial + position update
      });
    });

    it('only calls getAccountState once without position updates', async () => {
      render(<PerpsTabControlBar />);

      // Fast forward time to ensure no polling occurs
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(1); // Initial load only
      });
    });
  });

  describe('Press Handler', () => {
    it('calls onManageBalancePress when pressed', async () => {
      render(
        <PerpsTabControlBar onManageBalancePress={mockOnManageBalancePress} />,
      );

      const touchableOpacity = getTouchableOpacity();
      fireEvent.press(touchableOpacity);

      expect(mockOnManageBalancePress).toHaveBeenCalled();
    });

    it('does not throw when pressed without onManageBalancePress', async () => {
      render(<PerpsTabControlBar />);

      const touchableOpacity = getTouchableOpacity();
      expect(() => fireEvent.press(touchableOpacity)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles getAccountState errors gracefully', async () => {
      const error = new Error('Network error');
      mockGetAccountState.mockRejectedValue(error);

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });

      // Should still render without crashing
      expect(screen.getByText('Perp account balance')).toBeOnTheScreen();
      expect(screen.getByText('$0.00')).toBeOnTheScreen(); // Should show default value
    });

    it('handles animation errors gracefully', async () => {
      mockStartPulseAnimation.mockImplementation(() => {
        throw new Error('Animation error');
      });

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });

      // Should still update the balance even if animation fails
      await waitFor(() => {
        expect(screen.getByText('$800.25')).toBeOnTheScreen();
      });
    });

    it('logs error messages with proper formatting', async () => {
      const error = new Error('Test error');
      mockGetAccountState.mockRejectedValue(error);

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(DevLogger.log).toHaveBeenCalledWith(
          'PerpsTabControlBar: Error getting account balance:',
          'Failed to get account balance: Test error',
        );
      });
    });

    it('handles unknown errors', async () => {
      mockGetAccountState.mockRejectedValue('String error');

      render(<PerpsTabControlBar />);

      // Should still render without crashing
      expect(screen.getByText('Perp account balance')).toBeOnTheScreen();
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('cleans up subscription on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPositions.mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<PerpsTabControlBar />);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('stops animation on unmount', async () => {
      const { unmount } = render(<PerpsTabControlBar />);

      unmount();

      expect(mockStopAnimation).toHaveBeenCalled();
    });

    it('handles cleanup when subscription returns null', async () => {
      mockSubscribeToPositions.mockReturnValue(null);

      const { unmount } = render(<PerpsTabControlBar />);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty balance gracefully', async () => {
      mockGetAccountState.mockResolvedValue({
        ...defaultAccountState,
        totalBalance: '',
      });

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeOnTheScreen();
      });
    });

    it('handles null balance gracefully', async () => {
      mockGetAccountState.mockResolvedValue({
        ...defaultAccountState,
        totalBalance: null as unknown as string,
      });

      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(screen.getByText('$0.00')).toBeOnTheScreen();
      });
    });

    it('handles multiple rapid balance updates via position changes', async () => {
      let positionCallback: ((positions: Position[]) => void) | undefined;
      mockSubscribeToPositions.mockImplementation(({ callback }) => {
        positionCallback = callback;
        return jest.fn();
      });

      render(<PerpsTabControlBar />);

      // Simulate multiple rapid position updates with different values
      await act(async () => {
        positionCallback?.([
          {
            coin: 'BTC',
            size: '1.0',
            entryPrice: '50000',
            unrealizedPnl: '100',
          },
        ] as unknown as Position[]);
        positionCallback?.([
          {
            coin: 'ETH',
            size: '2.0',
            entryPrice: '3000',
            unrealizedPnl: '200',
          },
        ] as unknown as Position[]);
        positionCallback?.([
          { coin: 'SOL', size: '3.0', entryPrice: '100', unrealizedPnl: '300' },
        ] as unknown as Position[]);
      });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(4); // Initial + 3 position updates
      });
    });
  });

  describe('Integration', () => {
    it('integrates all hooks correctly', async () => {
      render(
        <PerpsTabControlBar onManageBalancePress={mockOnManageBalancePress} />,
      );

      // Verify all hooks are called
      expect(PerpsHooks.usePerpsTrading).toHaveBeenCalled();
      expect(PerpsHooks.useColorPulseAnimation).toHaveBeenCalled();
      expect(PerpsHooks.useBalanceComparison).toHaveBeenCalled();
      expect(ComponentLibraryHooks.useStyles).toHaveBeenCalled();

      // Verify integration flow
      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
        expect(mockCompareAndUpdateBalance).toHaveBeenCalled();
        expect(mockStartPulseAnimation).toHaveBeenCalled();
      });

      // Test press interaction
      const touchableOpacity = getTouchableOpacity();
      fireEvent.press(touchableOpacity);
      expect(mockOnManageBalancePress).toHaveBeenCalled();
    });

    it('passes correct parameters between hooks', async () => {
      render(<PerpsTabControlBar />);

      await waitFor(() => {
        expect(mockCompareAndUpdateBalance).toHaveBeenCalledWith('1000.50');
        expect(mockStartPulseAnimation).toHaveBeenCalledWith('increase');
      });
    });
  });
});
