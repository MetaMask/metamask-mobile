import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePerpsOrderFills } from './usePerpsOrderFills';
import type { OrderFill, GetOrderFillsParams } from '../controllers/types';
import { CaipAccountId, Hex } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getOrderFills: jest.fn(),
    },
  },
}));

// Mock data
const mockOrderFills: OrderFill[] = [
  {
    orderId: 'fill-1',
    symbol: 'BTC',
    side: 'buy',
    size: '0.5',
    price: '50000',
    pnl: '100.5',
    direction: 'Open long',
    fee: '25.50',
    feeToken: 'USDC',
    timestamp: 1640995200000,
    startPosition: '0',
    success: true,
  },
  {
    orderId: 'fill-2',
    symbol: 'ETH',
    side: 'sell',
    size: '2.0',
    price: '3000',
    pnl: '-50.25',
    direction: 'Close short',
    fee: '15.75',
    feeToken: 'USDC',
    timestamp: 1640995100000,
    startPosition: '2.5',
    success: true,
  },
];

const mockPerpsController = Engine.context.PerpsController as jest.Mocked<
  typeof Engine.context.PerpsController
>;
const mockLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsOrderFills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up default successful mock
    mockPerpsController.getOrderFills.mockResolvedValue(mockOrderFills);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('returns initial state with empty fills and loading true', () => {
      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      // Assert
      expect(result.current.orderFills).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('returns initial state with loading false when skipInitialFetch is true', () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsOrderFills({ skipInitialFetch: true }),
      );

      // Assert
      expect(result.current.orderFills).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Successful data fetching', () => {
    it('fetches order fills successfully on mount', async () => {
      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      // Wait for async operations
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orderFills).toEqual(mockOrderFills);
      expect(result.current.error).toBeNull();
      expect(mockPerpsController.getOrderFills).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getOrderFills).toHaveBeenCalledWith(undefined);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Fetching order fills from controller...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Successfully fetched order fills',
        { fillCount: 2 },
      );
    });

    it('skips initial fetch when skipInitialFetch is true', async () => {
      // Act
      const { result } = renderHook(() =>
        usePerpsOrderFills({ skipInitialFetch: true }),
      );

      // Wait a bit to ensure no async operations are triggered
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.orderFills).toEqual([]);
      expect(mockPerpsController.getOrderFills).not.toHaveBeenCalled();
    });

    it('passes params correctly to controller', async () => {
      // Arrange
      const params: GetOrderFillsParams = {
        accountId: 'eip155:1:0x123' as CaipAccountId,
        user: '0x456' as Hex,
        startTime: 1640995000000,
        endTime: 1640995300000,
        limit: 10,
        aggregateByTime: true,
      };

      // Act
      const { result } = renderHook(() => usePerpsOrderFills({ params }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(mockPerpsController.getOrderFills).toHaveBeenCalledWith(params);
    });

    it('updates fills when data changes', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newOrderFills: OrderFill[] = [
        {
          orderId: 'fill-3',
          symbol: 'SOL',
          side: 'buy',
          size: '10',
          price: '100',
          pnl: '25.5',
          direction: 'Open long',
          fee: '5.25',
          feeToken: 'USDC',
          timestamp: 1640995400000,
          success: true,
        },
      ];

      // Mock new response
      mockPerpsController.getOrderFills.mockResolvedValue(newOrderFills);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.orderFills).toEqual(newOrderFills);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('handles fetch errors with empty fills', async () => {
      // Arrange
      const errorMessage = 'Network error';
      mockPerpsController.getOrderFills.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orderFills).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Perps: Failed to fetch order fills',
        expect.any(Error),
      );
    });

    it('handles fetch errors with existing fills on refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderFills());

      // Wait for initial successful fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.orderFills).toEqual(mockOrderFills);

      // Set up error for refresh
      const errorMessage = 'Refresh error';
      mockPerpsController.getOrderFills.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert - should keep existing data on refresh error
      expect(result.current.orderFills).toEqual(mockOrderFills);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('handles unknown error types', async () => {
      // Arrange
      mockPerpsController.getOrderFills.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.error).toBe('Unknown error occurred');
      expect(result.current.orderFills).toEqual([]);
    });

    it('clears error on successful refresh', async () => {
      // Arrange
      mockPerpsController.getOrderFills.mockRejectedValueOnce(
        new Error('Initial error'),
      );

      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Set up successful response for refresh
      mockPerpsController.getOrderFills.mockResolvedValue(mockOrderFills);

      // Act - trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.orderFills).toEqual(mockOrderFills);
    });
  });

  describe('Refresh functionality', () => {
    it('sets refreshing state correctly during refresh', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock slow response
      let resolvePromise: (value: OrderFill[]) => void;
      const slowPromise = new Promise<OrderFill[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockPerpsController.getOrderFills.mockReturnValue(slowPromise);

      // Act - trigger refresh
      act(() => {
        result.current.refresh();
      });

      // Assert - should be refreshing
      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isLoading).toBe(false);

      // Complete the promise
      act(() => {
        resolvePromise(mockOrderFills);
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });

    it('can be called multiple times without issues', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderFills());

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
      expect(result.current.orderFills).toEqual(mockOrderFills);
      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Polling functionality', () => {
    it('does not poll by default', async () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderFills());

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
      expect(mockPerpsController.getOrderFills).not.toHaveBeenCalled();
    });

    it('polls when enablePolling is true', async () => {
      // Arrange
      const pollingInterval = 30000; // 30 seconds
      const { result } = renderHook(() =>
        usePerpsOrderFills({ enablePolling: true, pollingInterval }),
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
        expect(mockPerpsController.getOrderFills).toHaveBeenCalledTimes(1);
      });

      // Act - advance time again
      act(() => {
        jest.advanceTimersByTime(pollingInterval);
      });

      await waitFor(() => {
        expect(mockPerpsController.getOrderFills).toHaveBeenCalledTimes(2);
      });
    });

    it('stops polling when component unmounts', async () => {
      // Arrange
      const pollingInterval = 10000;
      const { result, unmount } = renderHook(() =>
        usePerpsOrderFills({ enablePolling: true, pollingInterval }),
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
      expect(mockPerpsController.getOrderFills).not.toHaveBeenCalled();
    });
  });

  describe('Parameter changes', () => {
    it('refetches data when params change', async () => {
      // Arrange
      const initialParams: GetOrderFillsParams = {
        limit: 5,
        user: '0x456' as Hex,
      };
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetOrderFillsParams }) =>
          usePerpsOrderFills({ params }),
        { initialProps: { params: initialParams } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPerpsController.getOrderFills).toHaveBeenCalledWith(
        initialParams,
      );

      // Reset call count
      jest.clearAllMocks();

      // Act - change params
      const newParams: GetOrderFillsParams = {
        limit: 10,
        user: '0x456' as Hex,
      };
      rerender({ params: newParams });

      await waitFor(() => {
        expect(mockPerpsController.getOrderFills).toHaveBeenCalledWith(
          newParams,
        );
      });
    });

    it('handles params object reference changes correctly', async () => {
      // Arrange
      const { result, rerender } = renderHook(
        ({ params }: { params?: GetOrderFillsParams }) =>
          usePerpsOrderFills({ params }),
        { initialProps: { params: { limit: 5, user: '0x456' as Hex } } },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      // Act - same values, different object reference
      rerender({ params: { limit: 5, user: '0x456' as Hex } });

      // Wait a bit to see if it triggers a refetch
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Assert - should refetch due to object reference change
      await waitFor(() => {
        expect(mockPerpsController.getOrderFills).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty response array', async () => {
      // Arrange
      mockPerpsController.getOrderFills.mockResolvedValue([]);

      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.orderFills).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null/undefined response gracefully', async () => {
      // Arrange
      mockPerpsController.getOrderFills.mockResolvedValue(
        null as unknown as OrderFill[],
      );

      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - should handle gracefully
      expect(result.current.orderFills).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('maintains loading state consistency during concurrent requests', async () => {
      // Arrange
      let resolveFirst: (value: OrderFill[]) => void;
      let resolveSecond: (value: OrderFill[]) => void;

      const firstPromise = new Promise<OrderFill[]>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<OrderFill[]>((resolve) => {
        resolveSecond = resolve;
      });

      mockPerpsController.getOrderFills
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // Act
      const { result } = renderHook(() => usePerpsOrderFills());

      // Start refresh while initial load is pending
      act(() => {
        result.current.refresh();
      });

      // Resolve both requests
      await act(async () => {
        resolveFirst([]);
        resolveSecond(mockOrderFills);

        // Wait for all promises to settle
        await firstPromise;
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
      });

      // Assert - should handle concurrent requests gracefully (last one wins)
      expect(result.current.orderFills).toEqual(mockOrderFills);
      expect(result.current.error).toBeNull();
    });
  });
});
