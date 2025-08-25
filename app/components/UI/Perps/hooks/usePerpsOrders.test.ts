import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsOrders } from './usePerpsOrders';
import type { Order, GetOrdersParams } from '../controllers/types';
import { CaipAccountId } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrders: jest.fn(),
    },
  },
}));

// Mock data
const mockOrders: Order[] = [
  {
    orderId: 'order-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    size: '0.1',
    originalSize: '0.1',
    price: '45000',
    filledSize: '0.05',
    remainingSize: '0.05',
    status: 'open',
    timestamp: 1640995200000,
    lastUpdated: 1640995250000,
  },
  {
    orderId: 'order-2',
    symbol: 'ETH',
    side: 'sell',
    orderType: 'market',
    size: '0',
    originalSize: '1.5',
    price: '3100',
    filledSize: '1.5',
    remainingSize: '0',
    status: 'filled',
    timestamp: 1640995100000,
    lastUpdated: 1640995150000,
  },
  {
    orderId: 'order-3',
    symbol: 'SOL',
    side: 'buy',
    orderType: 'limit',
    size: '5',
    originalSize: '5',
    price: '95',
    filledSize: '0',
    remainingSize: '5',
    status: 'canceled',
    timestamp: 1640995000000,
    lastUpdated: 1640995300000,
  },
];

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default successful mock
    mockPerpsController.getOrders.mockResolvedValue(mockOrders);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty orders and loading true', () => {
      // Act
      const { result } = renderHook(() => usePerpsOrders());

      // Assert
      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsOrders({ skipInitialFetch: true }),
      );

      // Assert
      expect(result.current.orders).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches orders successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsOrders());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBeNull();
      expect(mockPerpsController.getOrders).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getOrders).toHaveBeenCalledWith(undefined);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Fetching orders from controller...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Successfully fetched orders',
        { orderCount: 3 },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsOrders({ skipInitialFetch: true }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.orders).toEqual([]);
      expect(mockPerpsController.getOrders).not.toHaveBeenCalled();
    });

    it('passes params correctly to controller', async () => {
      // Arrange
      const params: GetOrdersParams = {
        accountId: 'eip155:1:0x123' as CaipAccountId,
        startTime: 1640995000000,
        endTime: 1640995300000,
        limit: 20,
      };

      // Act
      const { result } = renderHook(() => usePerpsOrders({ params }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(mockPerpsController.getOrders).toHaveBeenCalledWith(params);
    });

    it('updates orders when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newOrders: Order[] = [
        {
          orderId: 'order-4',
          symbol: 'DOGE',
          side: 'buy',
          orderType: 'limit',
          size: '1000',
          originalSize: '1000',
          price: '0.08',
          filledSize: '0',
          remainingSize: '1000',
          status: 'queued',
          timestamp: 1640995400000,
          lastUpdated: 1640995400000,
        },
      ];

      // Mock new response
      mockPerpsController.getOrders.mockResolvedValue(newOrders);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.orders).toEqual(newOrders);
      expect(result.current.error).toBeNull();
    });

    it('handles different order statuses correctly', async () => {
      // Arrange
      const ordersWithVariousStatuses: Order[] = [
        {
          orderId: 'order-open',
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
          orderId: 'order-triggered',
          symbol: 'ETH',
          side: 'sell',
          orderType: 'limit',
          size: '0',
          originalSize: '1',
          price: '3000',
          filledSize: '1',
          remainingSize: '0',
          status: 'triggered',
          timestamp: 1640995100000,
          lastUpdated: 1640995150000,
        },
        {
          orderId: 'order-rejected',
          symbol: 'SOL',
          side: 'buy',
          orderType: 'market',
          size: '10',
          originalSize: '10',
          price: '100',
          filledSize: '0',
          remainingSize: '10',
          status: 'rejected',
          timestamp: 1640995000000,
          lastUpdated: 1640995050000,
        },
      ];

      mockPerpsController.getOrders.mockResolvedValue(
        ordersWithVariousStatuses,
      );

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orders).toEqual(ordersWithVariousStatuses);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with empty orders', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockPerpsController.getOrders.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to fetch orders',
        expect.any(Error),
      );
    });

    it('handles fetch errors with existing orders on refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrders());

      // Wait for initial successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orders).toEqual(mockOrders);

      // Set up error for refresh
      const errorMessage = 'Refresh error';
      mockPerpsController.getOrders.mockRejectedValue(new Error(errorMessage));

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - should keep existing data on refresh error
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockPerpsController.getOrders.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.orders).toEqual([]);
    });

    it('clears error on successful refresh', async () => {
      // Arrange
      mockPerpsController.getOrders.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockPerpsController.getOrders.mockResolvedValue(mockOrders);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.orders).toEqual(mockOrders);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response
      let resolvePromise: (value: Order[]) => void;
      const slowPromise = new Promise<Order[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockPerpsController.getOrders.mockReturnValue(slowPromise);

      // Act - trigger refresh
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockOrders);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - call refresh multiple times
      await act(async () => {
        await Promise.all([
          result.current.refresh(),
          result.current.refresh(),
          result.current.refresh(),
        ]);
      });

      // Assert - should still work correctly
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll by default', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset call count
      jest.clearAllMocks();

      // Act - advance time
      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      // Assert - should not have polled
      expect(mockPerpsController.getOrders).not.toHaveBeenCalled();
    });

    it('polls when enablePolling is true', async () => {
      // Arrange
      const pollingInterval = 30000; // 30 seconds
      const { result } = renderHook(() =>
        usePerpsOrders({ enablePolling: true, pollingInterval }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Reset call count
      jest.clearAllMocks();

      // Act - advance time by polling interval
      act(() => {
        jest.advanceTimersByTime(pollingInterval);
      });

      // Wait for the polling request to complete
      await waitFor(() => {
        expect(mockPerpsController.getOrders).toHaveBeenCalledTimes(1);
      });

      // Act - advance time again
      act(() => {
        jest.advanceTimersByTime(pollingInterval);
      });

      await waitFor(() => {
        expect(mockPerpsController.getOrders).toHaveBeenCalledTimes(2);
      });
    });

    it('uses custom polling interval correctly', async () => {
      // Arrange
      const customInterval = 15000; // 15 seconds
      const { result } = renderHook(() =>
        usePerpsOrders({
          enablePolling: true,
          pollingInterval: customInterval,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - advance time less than interval
      act(() => {
        jest.advanceTimersByTime(customInterval - 1000);
      });

      // Assert - should not poll yet
      expect(mockPerpsController.getOrders).not.toHaveBeenCalled();

      // Act - advance time to complete interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockPerpsController.getOrders).toHaveBeenCalledTimes(1);
      });
    });

    it('stops polling when component unmounts', async () => {
      // Arrange
      const pollingInterval = 10000;
      const { result, unmount } = renderHook(() =>
        usePerpsOrders({ enablePolling: true, pollingInterval }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - unmount component
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(pollingInterval * 2);
      });

      // Assert - should not poll after unmount
      expect(mockPerpsController.getOrders).not.toHaveBeenCalled();
    });
  });

  describe('Parameter changes', () => {
    it('refetches data when params change', async () => {
      // Arrange
      const initialParams: GetOrdersParams = { limit: 10 };
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetOrdersParams }) =>
          usePerpsOrders({ params }),
        { initialProps: { params: initialParams } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPerpsController.getOrders).toHaveBeenCalledWith(initialParams);

      // Reset call count
      jest.clearAllMocks();

      // Act - change params
      const newParams: GetOrdersParams = { limit: 50 };
      rerender({ params: newParams });

      await waitFor(() => {
        expect(mockPerpsController.getOrders).toHaveBeenCalledWith(newParams);
      });
    });

    it('handles params object reference changes correctly', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetOrdersParams }) =>
          usePerpsOrders({ params }),
        { initialProps: { params: { limit: 10 } } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - same values, different object reference
      rerender({ params: { limit: 10 } });

      // Wait a bit to see if it triggers a refetch
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert - should refetch due to object reference change
      await waitFor(() => {
        expect(mockPerpsController.getOrders).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty response array', async () => {
      // Arrange
      mockPerpsController.getOrders.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      // Arrange
      mockPerpsController.getOrders.mockResolvedValue(
        null as unknown as Order[],
      );

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should handle gracefully
      expect(result.current.orders).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('maintains loading state consistency during concurrent requests', async () => {
      // Arrange
      let resolveFirst: (value: Order[]) => void;
      let resolveSecond: (value: Order[]) => void;

      const firstPromise = new Promise<Order[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<Order[]>((resolve) => {
        resolveSecond = resolve;
      });

      mockPerpsController.getOrders
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      // Start refresh while initial load is pending
      act(() => {
        result.current.refresh();
      });

      // Resolve both requests
      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockOrders);

        // Wait for all promises to settle
        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
      });

      // Assert - should handle concurrent requests gracefully (last one wins)
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBeNull();
    });

    it('handles orders with different order types', async () => {
      // Arrange
      const mixedOrderTypes: Order[] = [
        {
          orderId: 'market-order',
          symbol: 'BTC',
          side: 'buy',
          orderType: 'market',
          size: '0',
          originalSize: '0.5',
          price: '50000',
          filledSize: '0.5',
          remainingSize: '0',
          status: 'filled',
          timestamp: 1640995200000,
          lastUpdated: 1640995201000,
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

      mockPerpsController.getOrders.mockResolvedValue(mixedOrderTypes);

      // Act
      const { result } = renderHook(() => usePerpsOrders());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orders).toEqual(mixedOrderTypes);
      expect(result.current.error).toBeNull();
    });
  });
});
