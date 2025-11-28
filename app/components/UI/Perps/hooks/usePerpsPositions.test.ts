import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePerpsPositions } from './usePerpsPositions';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './usePerpsConnection';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '../controllers/types';

jest.mock('./usePerpsTrading');
jest.mock('./usePerpsConnection');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs
const { useFocusEffect } = require('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

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

    mockGetPositions = jest.fn().mockResolvedValue(mockPositions);

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
      updateMargin: jest.fn(),
      flipPosition: jest.fn(),
      calculateFees: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getOrderFills: jest.fn(),
      getOrders: jest.fn(),
      getFunding: jest.fn(),
    });

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
      const { result } = renderHook(() => usePerpsPositions());

      expect(result.current.positions).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.loadPositions).toBe('function');
    });

    it('returns initial state with loading true when loadOnMount is false', () => {
      const { result } = renderHook(() =>
        usePerpsPositions({ loadOnMount: false }),
      );

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

      const { result } = renderHook(() => usePerpsPositions());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.positions).toEqual([]);
      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('loads data when connection becomes ready', async () => {
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

      expect(mockGetPositions).not.toHaveBeenCalled();

      isConnected = true;
      isInitialized = true;
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(1);
      expect(result.current.positions).toEqual(mockPositions);
    });
  });

  describe('Successful position loading', () => {
    it('loads positions successfully on mount', async () => {
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

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
      const { result } = renderHook(() =>
        usePerpsPositions({ loadOnMount: false }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetPositions).not.toHaveBeenCalled();
      expect(result.current.positions).toEqual([]);
    });

    it('handles empty positions array', async () => {
      mockGetPositions.mockResolvedValue([]);

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      mockGetPositions.mockResolvedValue(null);

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('updates positions when data changes', async () => {
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

      mockGetPositions.mockResolvedValue(newPositions);

      await act(async () => {
        await result.current.loadPositions({ isRefresh: true });
      });

      expect(result.current.positions).toEqual(newPositions);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles load errors', async () => {
      const errorMessage = 'Failed to load positions';
      mockGetPositions.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsPositions: Error loading positions',
        expect.any(Error),
      );
    });

    it('handles unknown error types', async () => {
      mockGetPositions.mockRejectedValue('String error');

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load positions');
    });

    it('clears error on successful reload', async () => {
      mockGetPositions.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockGetPositions.mockResolvedValue(mockPositions);

      await act(async () => {
        await result.current.loadPositions();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.positions).toEqual(mockPositions);
    });

    it('calls onError callback when provided', async () => {
      const errorMessage = 'Test error';
      const onError = jest.fn();
      mockGetPositions.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => usePerpsPositions({ onError }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolvePromise: (value: Position[]) => void;
      const slowPromise = new Promise<Position[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPositions.mockReturnValue(slowPromise);

      act(() => {
        result.current.loadPositions({ isRefresh: true });
      });

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        resolvePromise(mockPositions);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await Promise.all([
          result.current.loadPositions({ isRefresh: true }),
          result.current.loadPositions({ isRefresh: true }),
          result.current.loadPositions({ isRefresh: true }),
        ]);
      });

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });

    it('refreshes on focus when refreshOnFocus is true', async () => {
      renderHook(() => usePerpsPositions({ refreshOnFocus: true }));

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      mockGetPositions.mockClear();

      // Act - simulate focus by calling the stored callback
      const focusCallback = useFocusEffect.mock.calls[0][0];
      await act(async () => {
        focusCallback();
      });

      expect(mockGetPositions).toHaveBeenCalled();
    });

    it('does not refresh on focus when refreshOnFocus is false', async () => {
      renderHook(() => usePerpsPositions({ refreshOnFocus: false }));

      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalled();
      });

      mockGetPositions.mockClear();

      // Act - simulate focus
      const focusCallback = useFocusEffect.mock.calls[1][0];
      await act(async () => {
        focusCallback();
      });

      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('does not refresh on focus when not connected', async () => {
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

      expect(mockGetPositions).not.toHaveBeenCalled();
    });
  });

  describe('Callback functionality', () => {
    it('calls onSuccess callback when provided', async () => {
      const onSuccess = jest.fn();

      const { result } = renderHook(() => usePerpsPositions({ onSuccess }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockPositions);
    });

    it('calls onSuccess on successful refresh', async () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsPositions({ onSuccess }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      onSuccess.mockClear();

      await act(async () => {
        await result.current.loadPositions({ isRefresh: true });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockPositions);
    });
  });

  describe('Loading states', () => {
    it('uses isLoading for initial load', async () => {
      const { result } = renderHook(() => usePerpsPositions());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('uses isRefreshing for refresh operations', async () => {
      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolvePromise: (value: Position[]) => void;
      const slowPromise = new Promise<Position[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPositions.mockReturnValue(slowPromise);

      act(() => {
        result.current.loadPositions({ isRefresh: true });
      });

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        resolvePromise(mockPositions);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('maintains consistent state transitions', async () => {
      const states: {
        isLoading: boolean;
        isRefreshing: boolean;
      }[] = [];

      const { result } = renderHook(() => usePerpsPositions());

      states.push({
        isLoading: result.current.isLoading,
        isRefreshing: result.current.isRefreshing,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      states.push({
        isLoading: result.current.isLoading,
        isRefreshing: result.current.isRefreshing,
      });

      expect(states[0]).toEqual({ isLoading: true, isRefreshing: false });
      expect(states[1]).toEqual({ isLoading: false, isRefreshing: false });
    });
  });

  describe('Edge cases', () => {
    it('handles positions with negative PnL', async () => {
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

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual(positionsWithNegativePnl);
      expect(result.current.error).toBeNull();
    });

    it('handles positions with TP/SL orders', async () => {
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

      const { result } = renderHook(() => usePerpsPositions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual(positionsWithTPSL);
    });

    it('handles concurrent load requests gracefully', async () => {
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

      const { result } = renderHook(() => usePerpsPositions());

      act(() => {
        result.current.loadPositions();
      });

      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockPositions);

        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.error).toBeNull();
    });
  });
});
