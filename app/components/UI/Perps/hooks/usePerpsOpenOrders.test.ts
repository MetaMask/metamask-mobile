import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsOpenOrders } from './usePerpsOpenOrders';
import { usePerpsConnection } from './usePerpsConnection';
import type { Order, GetOrdersParams } from '../controllers/types';

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOpenOrders: jest.fn(),
    },
  },
}));
jest.mock('./usePerpsConnection');

const mockOpenOrders: Order[] = [
  {
    orderId: 'open-order-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    size: '0.1',
    originalSize: '0.1',
    price: '45000',
    filledSize: '0',
    remainingSize: '0.1',
    status: 'open',
    timestamp: 1640995200000,
    lastUpdated: 1640995200000,
  },
  {
    orderId: 'open-order-2',
    symbol: 'ETH',
    side: 'sell',
    orderType: 'limit',
    size: '2',
    originalSize: '2',
    price: '3100',
    filledSize: '0',
    remainingSize: '2',
    status: 'open',
    timestamp: 1640995100000,
    lastUpdated: 1640995100000,
  },
];

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUsePerpsConnection = usePerpsConnection as jest.MockedFunction<
  typeof usePerpsConnection
>;

describe('usePerpsOpenOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockPerpsController.getOpenOrders.mockResolvedValue(mockOpenOrders);
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

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty orders and loading true', () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ skipInitialFetch: true }),
      );

      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Connection readiness', () => {
    it('waits for connection to be ready before fetching', async () => {
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

      const { result } = renderHook(() => usePerpsOpenOrders());

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.orders).toEqual([]);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('fetches data when connection becomes ready', async () => {
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

      const { result, rerender } = renderHook(() => usePerpsOpenOrders());

      // Assert - not fetched yet
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();

      // Act - simulate connection ready
      isConnected = true;
      isInitialized = true;
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should fetch after connection ready
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      expect(result.current.orders).toEqual(mockOpenOrders);
    });
  });

  describe('Successful data fetching', () => {
    it('fetches open orders successfully on mount', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(undefined);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Fetching open orders from controller...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Successfully fetched open orders',
        { orderCount: 2 },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ skipInitialFetch: true }),
      );

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('passes params correctly to controller', async () => {
      const params: GetOrdersParams = {
        startTime: 1640995000000,
        endTime: 1640995300000,
        limit: 20,
      };

      const { result } = renderHook(() => usePerpsOpenOrders({ params }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(params);
    });

    it('updates orders when data changes', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newOrders: Order[] = [
        {
          orderId: 'new-order',
          symbol: 'SOL',
          side: 'buy',
          orderType: 'limit',
          size: '5',
          originalSize: '5',
          price: '95',
          filledSize: '0',
          remainingSize: '5',
          status: 'open',
          timestamp: 1640995400000,
          lastUpdated: 1640995400000,
        },
      ];

      mockPerpsController.getOpenOrders.mockResolvedValue(newOrders);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.orders).toEqual(newOrders);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with empty orders', async () => {
      const errorMessage = 'Network error';
      mockPerpsController.getOpenOrders.mockRejectedValue(
        new Error(errorMessage),
      );

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to fetch open orders',
        expect.any(Error),
      );
    });

    it('keeps existing orders on refresh error', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual(mockOpenOrders);

      const errorMessage = 'Refresh error';
      mockPerpsController.getOpenOrders.mockRejectedValue(
        new Error(errorMessage),
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('handles unknown error types', async () => {
      mockPerpsController.getOpenOrders.mockRejectedValue('String error');

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.orders).toEqual([]);
    });

    it('clears error on successful refresh', async () => {
      mockPerpsController.getOpenOrders.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockPerpsController.getOpenOrders.mockResolvedValue(mockOpenOrders);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.orders).toEqual(mockOpenOrders);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let resolvePromise: (value: Order[]) => void;
      const slowPromise = new Promise<Order[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockPerpsController.getOpenOrders.mockReturnValue(slowPromise);

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      act(() => {
        resolvePromise(mockOpenOrders);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await Promise.all([
          result.current.refresh(),
          result.current.refresh(),
          result.current.refresh(),
        ]);
      });

      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll by default', async () => {
      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        jest.advanceTimersByTime(60000); // 60 seconds
      });

      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('polls when enablePolling is true', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      });
    });

    it('uses custom polling interval', async () => {
      const { result } = renderHook(() =>
        usePerpsOpenOrders({
          enablePolling: true,
          pollingInterval: 10000, // 10 seconds
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledTimes(1);
      });
    });

    it('stops polling when connection is lost', async () => {
      let isConnected = true;

      mockUsePerpsConnection.mockImplementation(() => ({
        isConnected,
        isConnecting: false,
        isInitialized: true,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: jest.fn(),
      }));

      const { result, rerender } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      isConnected = false;
      rerender();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });

    it('cleans up polling interval on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        usePerpsOpenOrders({ enablePolling: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockPerpsController.getOpenOrders).not.toHaveBeenCalled();
    });
  });

  describe('Parameter changes', () => {
    it('refetches data when params change', async () => {
      const initialParams: GetOrdersParams = { limit: 10 };
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetOrdersParams }) =>
          usePerpsOpenOrders({ params }),
        { initialProps: { params: initialParams } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(
        initialParams,
      );

      jest.clearAllMocks();

      const newParams: GetOrdersParams = { limit: 50 };
      rerender({ params: newParams });

      await waitFor(() => {
        expect(mockPerpsController.getOpenOrders).toHaveBeenCalledWith(
          newParams,
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty response array', async () => {
      mockPerpsController.getOpenOrders.mockResolvedValue([]);

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      mockPerpsController.getOpenOrders.mockResolvedValue(
        null as unknown as Order[],
      );

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('maintains loading state consistency during concurrent requests', async () => {
      let resolveFirst: (value: Order[]) => void;
      let resolveSecond: (value: Order[]) => void;

      const firstPromise = new Promise<Order[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<Order[]>((resolve) => {
        resolveSecond = resolve;
      });

      mockPerpsController.getOpenOrders
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => usePerpsOpenOrders());

      act(() => {
        result.current.refresh();
      });

      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockOpenOrders);

        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
      });

      expect(result.current.orders).toEqual(mockOpenOrders);
      expect(result.current.error).toBeNull();
    });

    it('handles orders with different statuses', async () => {
      const mixedStatusOrders: Order[] = [
        {
          orderId: 'open-order',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'limit',
          size: '0.1',
          originalSize: '0.1',
          price: '45000',
          filledSize: '0',
          remainingSize: '0.1',
          status: 'open',
          timestamp: 1640995200000,
          lastUpdated: 1640995200000,
        },
        {
          orderId: 'queued-order',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '2',
          originalSize: '2',
          price: '3000',
          filledSize: '0',
          remainingSize: '2',
          status: 'queued',
          timestamp: 1640995100000,
          lastUpdated: 1640995100000,
        },
      ];

      mockPerpsController.getOpenOrders.mockResolvedValue(mixedStatusOrders);

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual(mixedStatusOrders);
      expect(result.current.error).toBeNull();
    });

    it('handles orders with different order types', async () => {
      const mixedOrderTypes: Order[] = [
        {
          orderId: 'market-order',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'market',
          size: '0.5',
          originalSize: '0.5',
          price: '50000',
          filledSize: '0',
          remainingSize: '0.5',
          status: 'open',
          timestamp: 1640995200000,
          lastUpdated: 1640995200000,
        },
        {
          orderId: 'limit-order',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '2',
          originalSize: '2',
          price: '3000',
          filledSize: '0',
          remainingSize: '2',
          status: 'open',
          timestamp: 1640995100000,
          lastUpdated: 1640995100000,
        },
      ];

      mockPerpsController.getOpenOrders.mockResolvedValue(mixedOrderTypes);

      const { result } = renderHook(() => usePerpsOpenOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual(mixedOrderTypes);
      expect(result.current.error).toBeNull();
    });
  });
});
