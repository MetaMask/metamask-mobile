import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePerpsPositions } from './usePerpsPositions';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './usePerpsConnection';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../controllers/types';

// Mock dependencies
jest.mock('./usePerpsTrading');
jest.mock('./usePerpsConnection');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// Get mocked useFocusEffect
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs
const { useFocusEffect } = require('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

// Mock data
const mockPositions: Position[] = [
  {
    coin: 'BTC',
    size: '0.5',
    entryPrice: '45000',
    positionValue: '22500',
    unrealizedPnl: '250',
    returnOnEquity: '0.05',
    leverage: {
      type: 'cross',
      value: 2,
      rawUsd: '3000',
    },
    liquidationPrice: '40000',
    marginUsed: '1500',
    maxLeverage: 100,
    cumulativeFunding: {
      allTime: '50',
      sinceOpen: '10',
      sinceChange: '5',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  },
  {
    coin: 'ETH',
    size: '2',
    entryPrice: '3000',
    positionValue: '6000',
    unrealizedPnl: '100',
    returnOnEquity: '0.03',
    leverage: {
      type: 'cross',
      value: 3,
      rawUsd: '2000',
    },
    liquidationPrice: '2500',
    marginUsed: '800',
    maxLeverage: 50,
    cumulativeFunding: {
      allTime: '20',
      sinceOpen: '5',
      sinceChange: '2',
    },
    takeProfitCount: 1,
    stopLossCount: 1,
  },
];

const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;
const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
  typeof usePerpsConnection
>;

describe('usePerpsPositions', () => {
  let mockGetPositions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock for getPositions
    mockGetPositions = jest.fn().mockResolvedValue(mockPositions);

    // Mock usePerpsTrading
    mockUsePerpsTrading.mockReturnValue({
      getPositions: mockGetPositions,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      depositWithConfirmation: jest.fn(),
      clearDepositResult: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      calculateFees: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
    });

    // Mock usePerpsConnection to be ready by default
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
  });

  describe('Initial state', () => {
    it('returns initial state with empty positions and loading true', () => {
      // Act
      const { result } = renderHook(() => usePerpsPositions());

      // Assert
      expect(result.current.positions).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.loadPositions).toBe('function');
    });

    it('returns initial state with loading true when loadOnMount is false', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsPositions({ loadOnMount: false }),
      );

      // Assert
      expect(result.current.positions).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Connection readiness', () => {
    it('waits for connection to be ready before loading', async () => {
      // Arrange - start with disconnected state
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      });

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        await Promise.resolve();
      });

      // Assert - should not load while disconnected
      expect(result.current.isLoading).toBe(true);
      expect(result.current.positions).toEqual([]);
      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('loads data when connection becomes ready', async () => {
      // Arrange - start disconnected
      let isConnected = false;
      let isInitialized = false;

      mockUsePerpsConnection.mockImplementation(() => ({
        isConnected,
        isConnecting: false,
        isInitialized,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      }));

      const { result, rerender } = renderHook(() => usePerpsPositions());

      // Assert - not loaded yet
      expect(mockGetPositions).not.toHaveBeenCalled();

      // Act - simulate connection ready
      isConnected = true;
      isInitialized = true;
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should load after connection ready
      expect(mockGetPositions).toHaveBeenCalledTimes(1);
      expect(result.current.positions).toEqual(mockPositions);
    });
  });

  describe('Successful position loading', () => {
    it('loads positions successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsPositions());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.error).toBeNull();
      expect(mockGetPositions).toHaveBeenCalledTimes(1);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsPositions: Loaded positions',
        expect.objectContaining({
          count: 2,
          positions: expect.any(Array),
        }),
      );
    });

    it('skips initial load when loadOnMount is false', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsPositions({ loadOnMount: false }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(mockGetPositions).not.toHaveBeenCalled();
      expect(result.current.positions).toEqual([]);
    });

    it('handles empty positions array', async () => {
      // Arrange
      mockGetPositions.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      // Arrange
      mockGetPositions.mockResolvedValue(null);

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should handle gracefully
      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('updates positions when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPositions: Position[] = [
        {
          coin: 'SOL',
          size: '10',
          entryPrice: '95',
          positionValue: '950',
          unrealizedPnl: '50',
          returnOnEquity: '0.1',
          leverage: {
            type: 'cross',
            value: 5,
            rawUsd: '500',
          },
          liquidationPrice: '80',
          marginUsed: '200',
          maxLeverage: 20,
          cumulativeFunding: {
            allTime: '5',
            sinceOpen: '2',
            sinceChange: '1',
          },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      // Mock new response
      mockGetPositions.mockResolvedValue(newPositions);

      // Act - trigger refresh
      await act(async () => {
        await result.current.loadPositions({ isRefresh: true });
      });

      // Assert
      expect(result.current.positions).toEqual(newPositions);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles load errors', async () => {
      // Arrange
      const errorMessage = 'Failed to load positions';
      mockGetPositions.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsPositions: Error loading positions',
        expect.any(Error),
      );
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockGetPositions.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Failed to load positions');
    });

    it('clears error on successful reload', async () => {
      // Arrange
      mockGetPositions.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response
      mockGetPositions.mockResolvedValue(mockPositions);

      // Act - trigger reload
      await act(async () => {
        await result.current.loadPositions();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.positions).toEqual(mockPositions);
    });

    it('calls onError callback when provided', async () => {
      // Arrange
      const errorMessage = 'Test error';
      const onError = jest.fn();
      mockGetPositions.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => usePerpsPositions({ onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response
      let resolvePromise: (value: Position[]) => void;
      const slowPromise = new Promise<Position[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPositions.mockReturnValue(slowPromise);

      // Act - trigger refresh
      act(() => {
        result.current.loadPositions({ isRefresh: true });
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockPositions);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - call load multiple times
      await act(async () => {
        await Promise.all([
          result.current.loadPositions({ isRefresh: true }),
          result.current.loadPositions({ isRefresh: true }),
          result.current.loadPositions({ isRefresh: true }),
        ]);
      });

      // Assert - should still work correctly
      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });

    it('refreshes on focus when refreshOnFocus is true', async () => {
      // Arrange
      renderHook(() => usePerpsPositions({ refreshOnFocus: true }));

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      // Clear initial calls
      mockGetPositions.mockClear();

      // Act - simulate focus by calling the stored callback
      const focusCallback = useFocusEffect.mock.calls[0][0];
      await act(async () => {
        focusCallback();
      });

      // Assert - should have refreshed
      expect(mockGetPositions).toHaveBeenCalled();
    });

    it('does not refresh on focus when refreshOnFocus is false', async () => {
      // Arrange
      renderHook(() => usePerpsPositions({ refreshOnFocus: false }));

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      // Clear initial calls
      mockGetPositions.mockClear();

      // Act - simulate focus
      const focusCallback = useFocusEffect.mock.calls[1][0];
      await act(async () => {
        focusCallback();
      });

      // Assert - should not have refreshed
      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('does not refresh on focus when not connected', async () => {
      // Arrange
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      });

      renderHook(() =>
        usePerpsPositions({ refreshOnFocus: true, loadOnMount: false }),
      );

      // Clear any initial calls
      mockGetPositions.mockClear();

      // Act - simulate focus while disconnected
      // Get the latest useFocusEffect callback
      const latestCallIndex = useFocusEffect.mock.calls.length - 1;
      const focusCallback = useFocusEffect.mock.calls[latestCallIndex][0];
      await act(async () => {
        focusCallback();
      });

      // Assert - should not have refreshed
      expect(mockGetPositions).not.toHaveBeenCalled();
    });
  });

  describe('Callback functionality', () => {
    it('calls onSuccess callback when provided', async () => {
      // Arrange
      const onSuccess = jest.fn();

      // Act
      const { result } = renderHook(() => usePerpsPositions({ onSuccess }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(onSuccess).toHaveBeenCalledWith(mockPositions);
    });

    it('calls onSuccess on successful refresh', async () => {
      // Arrange
      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsPositions({ onSuccess }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear initial call
      onSuccess.mockClear();

      // Act - refresh
      await act(async () => {
        await result.current.loadPositions({ isRefresh: true });
      });

      // Assert
      expect(onSuccess).toHaveBeenCalledWith(mockPositions);
    });
  });

  describe('Loading states', () => {
    it('uses isLoading for initial load', async () => {
      // Act
      const { result } = renderHook(() => usePerpsPositions());

      // Assert - should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('uses isRefreshing for refresh operations', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create a slow promise
      let resolvePromise: (value: Position[]) => void;
      const slowPromise = new Promise<Position[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPositions.mockReturnValue(slowPromise);

      // Act - trigger refresh
      act(() => {
        result.current.loadPositions({ isRefresh: true });
      });

      // Assert - should use isRefreshing, not isLoading
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete
      act(() => {
        resolvePromise(mockPositions);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('maintains consistent state transitions', async () => {
      // Track state changes
      const states: {
        isLoading: boolean;
        isRefreshing: boolean;
      }[] = [];

      const { result } = renderHook(() => usePerpsPositions());

      // Record initial state
      states.push({
        isLoading: result.current.isLoading,
        isRefreshing: result.current.isRefreshing,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Record after load
      states.push({
        isLoading: result.current.isLoading,
        isRefreshing: result.current.isRefreshing,
      });

      // Assert - should have consistent state transitions
      expect(states[0]).toEqual({ isLoading: true, isRefreshing: false });
      expect(states[1]).toEqual({ isLoading: false, isRefreshing: false });
    });
  });

  describe('Edge cases', () => {
    it('handles positions with negative PnL', async () => {
      // Arrange
      const positionsWithNegativePnl: Position[] = [
        {
          coin: 'BTC',
          size: '-0.5', // Short position
          entryPrice: '45000',
          positionValue: '22500',
          unrealizedPnl: '-500', // Losing trade
          returnOnEquity: '-0.1',
          leverage: {
            type: 'cross',
            value: 2,
            rawUsd: '3000',
          },
          liquidationPrice: '50000',
          marginUsed: '1500',
          maxLeverage: 100,
          cumulativeFunding: {
            allTime: '50',
            sinceOpen: '10',
            sinceChange: '5',
          },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      mockGetPositions.mockResolvedValue(positionsWithNegativePnl);

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.positions).toEqual(positionsWithNegativePnl);
      expect(result.current.error).toBeNull();
    });

    it('handles positions with TP/SL orders', async () => {
      // Arrange
      const positionsWithTPSL: Position[] = [
        {
          coin: 'ETH',
          size: '2',
          entryPrice: '3000',
          positionValue: '6000',
          unrealizedPnl: '100',
          returnOnEquity: '0.03',
          leverage: {
            type: 'isolated',
            value: 5,
            rawUsd: '1200',
          },
          liquidationPrice: '2500',
          marginUsed: '800',
          maxLeverage: 50,
          cumulativeFunding: {
            allTime: '20',
            sinceOpen: '5',
            sinceChange: '2',
          },
          takeProfitCount: 2, // Multiple TP orders
          stopLossCount: 1,
        },
      ];

      mockGetPositions.mockResolvedValue(positionsWithTPSL);

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.positions).toEqual(positionsWithTPSL);
    });

    it('handles concurrent load requests gracefully', async () => {
      // Arrange
      let resolveFirst: (value: Position[]) => void;
      let resolveSecond: (value: Position[]) => void;

      const firstPromise = new Promise<Position[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<Position[]>((resolve) => {
        resolveSecond = resolve;
      });

      mockGetPositions
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // Act
      const { result } = renderHook(() => usePerpsPositions());

      // Start another load while first is pending
      act(() => {
        result.current.loadPositions();
      });

      // Resolve both requests
      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockPositions);

        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should handle gracefully (last one wins)
      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.error).toBeNull();
    });
  });
});
