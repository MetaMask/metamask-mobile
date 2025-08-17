import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsOpenOrders } from './usePerpsOpenOrders';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { Order, GetOrdersParams } from '../controllers/types';

// Mock Engine and DevLogger
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../providers/PerpsConnectionProvider', () => ({
  usePerpsConnection: jest.fn(() => ({
    isInitialized: true,
    isConnected: true,
  })),
}));

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsOpenOrders', () => {
  const mockOrders: Order[] = [
    {
      orderId: 'order-1',
      symbol: 'BTC-PERP',
      side: 'buy',
      originalSize: '1.0',
      filledSize: '0.0',
      price: '50000',
      orderType: 'limit',
      status: 'open',
      timestamp: Date.now(),
      reduceOnly: false,
    } as Order,
    {
      orderId: 'order-2',
      symbol: 'ETH-PERP',
      side: 'sell',
      originalSize: '10.0',
      filledSize: '0.0',
      price: '3000',
      orderType: 'limit',
      status: 'open',
      timestamp: Date.now(),
      reduceOnly: false,
    } as Order,
  ];

  const mockParams = {
    symbol: 'BTC-PERP',
    limit: 100,
  };

  let mockGetOpenOrders: jest.MockedFunction<
    (params?: GetOrdersParams) => Promise<Order[]>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mock implementations
    mockGetOpenOrders = jest.fn().mockResolvedValue(mockOrders);
    mockEngine.context.PerpsController = {
      getOpenOrders: mockGetOpenOrders,
    } as unknown as typeof mockEngine.context.PerpsController;

    mockDevLogger.log = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches open orders on mount by default', async () => {
    const { result } = renderHook(() => usePerpsOpenOrders());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBeNull();

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(result.current.orders).toEqual(mockOrders);
    expect(
      mockEngine.context.PerpsController.getOpenOrders,
    ).toHaveBeenCalledWith(undefined);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Fetching open orders from controller...',
    );
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Successfully fetched open orders',
      {
        orderCount: 2,
      },
    );
  });

  it('skips initial fetch when skipInitialFetch is true', () => {
    const { result } = renderHook(() =>
      usePerpsOpenOrders({ skipInitialFetch: true }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.orders).toEqual([]);
    expect(
      mockEngine.context.PerpsController.getOpenOrders,
    ).not.toHaveBeenCalled();
  });

  it('passes params to getOpenOrders when provided', async () => {
    const { result } = renderHook(() =>
      usePerpsOpenOrders({ params: mockParams }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(
      mockEngine.context.PerpsController.getOpenOrders,
    ).toHaveBeenCalledWith(mockParams);
  });

  it('handles successful data refresh', async () => {
    const { result } = renderHook(() => usePerpsOpenOrders());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock new data for refresh
    const newOrders = [{ ...mockOrders[0], price: '51000' }];
    mockGetOpenOrders.mockResolvedValueOnce(newOrders);

    // Trigger refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.orders).toEqual(newOrders);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Fetching open orders from controller...',
    );
  });

  it('handles refresh errors without clearing existing data', async () => {
    const { result } = renderHook(() => usePerpsOpenOrders());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock error on refresh
    const errorMessage = 'Network error';
    mockGetOpenOrders.mockRejectedValueOnce(new Error(errorMessage));

    // Trigger refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBe(errorMessage);
    // Existing data should be preserved on refresh error
    expect(result.current.orders).toEqual(mockOrders);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Failed to fetch open orders',
      expect.any(Error),
    );
  });

  it('clears existing data on initial fetch error', async () => {
    const errorMessage = 'Initial fetch failed';
    mockGetOpenOrders.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => usePerpsOpenOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.orders).toEqual([]);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Failed to fetch open orders',
      expect.any(Error),
    );
  });

  it('handles non-Error exceptions gracefully', async () => {
    mockGetOpenOrders.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => usePerpsOpenOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Unknown error occurred');
    expect(result.current.orders).toEqual([]);
  });

  it('enables polling when enablePolling is true', async () => {
    const pollingInterval = 1000;
    const { result } = renderHook(() =>
      usePerpsOpenOrders({ enablePolling: true, pollingInterval }),
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fast-forward time to trigger polling
    act(() => {
      jest.advanceTimersByTime(pollingInterval);
    });

    await waitFor(() => {
      expect(
        mockEngine.context.PerpsController.getOpenOrders,
      ).toHaveBeenCalledTimes(2);
    });
  });

  it('uses default polling interval when not specified', async () => {
    const { result } = renderHook(() =>
      usePerpsOpenOrders({ enablePolling: true }),
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fast-forward to default 30 second interval
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(
        mockEngine.context.PerpsController.getOpenOrders,
      ).toHaveBeenCalledTimes(2);
    });
  });

  it('disables polling when enablePolling is false', async () => {
    const { result } = renderHook(() =>
      usePerpsOpenOrders({ enablePolling: false, pollingInterval: 1000 }),
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should only be called once (initial fetch)
    expect(
      mockEngine.context.PerpsController.getOpenOrders,
    ).toHaveBeenCalledTimes(1);
  });

  it('cleans up polling interval on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsOpenOrders({ enablePolling: true, pollingInterval: 1000 }),
    );

    // Unmount the hook
    unmount();

    // Fast-forward time - should not trigger additional calls
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should only be called once (initial fetch)
    expect(
      mockEngine.context.PerpsController.getOpenOrders,
    ).toHaveBeenCalledTimes(1);
  });

  it('handles empty orders array from controller', async () => {
    mockGetOpenOrders.mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePerpsOpenOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orders).toEqual([]);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Successfully fetched open orders',
      {
        orderCount: 0,
      },
    );
  });

  it('handles null response from controller', async () => {
    mockGetOpenOrders.mockResolvedValueOnce(null as unknown as Order[]);

    const { result } = renderHook(() => usePerpsOpenOrders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.orders).toEqual([]);
    expect(mockDevLogger.log).toHaveBeenCalledWith(
      'Perps: Successfully fetched open orders',
      {
        orderCount: 0,
      },
    );
  });

  it('maintains separate loading states for initial fetch and refresh', async () => {
    const { result } = renderHook(() => usePerpsOpenOrders());

    // Initial loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock delay for refresh
    mockGetOpenOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockOrders), 100)),
    );

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    // Should show refreshing state
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.isLoading).toBe(false);

    // Wait for refresh to complete
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('updates params dependency when params change', async () => {
    const { result, rerender } = renderHook(
      ({ params }) => usePerpsOpenOrders({ params }),
      { initialProps: { params: mockParams } },
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Change params
    const newParams = { symbol: 'ETH-PERP', limit: 50 };
    rerender({ params: newParams });

    // Should refetch with new params
    await waitFor(() => {
      expect(
        mockEngine.context.PerpsController.getOpenOrders,
      ).toHaveBeenCalledWith(newParams);
    });
  });
});
