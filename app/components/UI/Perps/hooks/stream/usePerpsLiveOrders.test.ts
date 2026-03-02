import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsLiveOrders } from './index';
import { type Order } from '@metamask/perps-controller';

// Mock Engine for lazy isInitialLoading check
const mockEngineState = {
  cachedOrders: null as Order[] | null,
  cachedUserDataTimestamp: 0,
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      get state() {
        return mockEngineState;
      },
    },
  },
}));

// Mock the stream provider
const mockSubscribe = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    orders: {
      subscribe: mockSubscribe,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLiveOrders', () => {
  const mockOrder: Order = {
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
  } as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes to orders on mount', () => {
    const throttleMs = 2000;
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLiveOrders({ throttleMs }));

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs,
    });
  });

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => usePerpsLiveOrders());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates orders when callback is invoked', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLiveOrders());

    // Initially empty
    expect(result.current).toEqual({ orders: [], isInitialLoading: true });

    // Simulate orders update
    const orders: Order[] = [
      mockOrder,
      { ...mockOrder, orderId: 'order-2', symbol: 'ETH-PERP' } as Order,
    ];

    act(() => {
      capturedCallback(orders);
    });

    await waitFor(() => {
      expect(result.current.orders).toEqual(orders);
    });
  });

  it('uses default throttle value when not provided', () => {
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLiveOrders());

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 0, // Default value for orders (no throttling for instant updates)
    });
  });

  it('handles throttle changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    mockSubscribe
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      ({ throttleMs }) => usePerpsLiveOrders({ throttleMs }),
      {
        initialProps: { throttleMs: 500 },
      },
    );

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 500,
    });

    // Change throttle
    rerender({ throttleMs: 1000 });

    // Should resubscribe with new throttle
    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });

  it('handles empty orders array', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLiveOrders());

    act(() => {
      capturedCallback([]);
    });

    await waitFor(() => {
      expect(result.current.orders).toEqual([]);
    });
  });

  it('handles null or undefined updates gracefully', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLiveOrders());

    // Send null update (should be handled gracefully)
    act(() => {
      capturedCallback(null as unknown as Order[]);
    });

    // Should not crash and orders should remain empty
    expect(result.current.orders).toEqual([]);

    // Send undefined update
    act(() => {
      capturedCallback(undefined as unknown as Order[]);
    });

    // Should still not crash
    expect(result.current.orders).toEqual([]);

    // Send valid update to ensure it still works
    const validOrders: Order[] = [mockOrder];

    act(() => {
      capturedCallback(validOrders);
    });

    await waitFor(() => {
      expect(result.current.orders).toEqual(validOrders);
    });
  });

  describe('initial state from cache', () => {
    it('seeds orders from cache when fresh cached data exists', () => {
      const cachedOrders: Order[] = [
        mockOrder,
        { ...mockOrder, orderId: 'order-2', symbol: 'ETH-PERP' } as Order,
      ];

      mockEngineState.cachedOrders = cachedOrders;
      mockEngineState.cachedUserDataTimestamp = Date.now();

      mockSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLiveOrders());

      expect(result.current.orders).toEqual(cachedOrders);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('returns empty orders for stale cache (older than 60s)', () => {
      mockEngineState.cachedOrders = [mockOrder];
      mockEngineState.cachedUserDataTimestamp = Date.now() - 61_000;

      mockSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLiveOrders());

      // getPreloadedData enforces 60s TTL — stale cache is not used
      expect(result.current.orders).toEqual([]);
      expect(result.current.isInitialLoading).toBe(true);
    });

    it('returns empty orders when no cache exists', () => {
      mockEngineState.cachedOrders = null;
      mockEngineState.cachedUserDataTimestamp = 0;

      mockSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLiveOrders());

      expect(result.current.orders).toEqual([]);
      expect(result.current.isInitialLoading).toBe(true);
    });

    it('handles empty cached orders array (valid cache, no orders)', () => {
      mockEngineState.cachedOrders = [];
      mockEngineState.cachedUserDataTimestamp = Date.now();

      mockSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLiveOrders());

      expect(result.current.orders).toEqual([]);
      expect(result.current.isInitialLoading).toBe(false);
    });
  });

  it('replaces orders on each update', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLiveOrders());

    // First update
    const firstOrders: Order[] = [mockOrder];
    act(() => {
      capturedCallback(firstOrders);
    });

    await waitFor(() => {
      expect(result.current.orders).toEqual(firstOrders);
    });

    // Second update with different orders
    const secondOrders: Order[] = [
      { ...mockOrder, orderId: 'order-2' } as Order,
      { ...mockOrder, orderId: 'order-3' } as Order,
    ];

    act(() => {
      capturedCallback(secondOrders);
    });

    await waitFor(() => {
      expect(result.current.orders).toEqual(secondOrders);
      expect(result.current.orders).not.toContain(mockOrder);
    });
  });

  it('filters reduce-only orders when hideReduceOnly is enabled', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveOrders({ hideReduceOnly: true }),
    );

    const orders: Order[] = [
      {
        ...mockOrder,
        orderId: 'regular-order',
        reduceOnly: false,
        detailedOrderType: 'Limit',
      } as Order,
      {
        ...mockOrder,
        orderId: 'reduce-only-order',
        reduceOnly: true,
        detailedOrderType: 'Limit',
      } as Order,
    ];

    act(() => {
      capturedCallback(orders);
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].orderId).toBe('regular-order');
    });
  });

  it('applies hideTpSl and hideReduceOnly together', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLiveOrders({ hideTpSl: true, hideReduceOnly: true }),
    );

    const orders: Order[] = [
      {
        ...mockOrder,
        orderId: 'regular-order',
        reduceOnly: false,
        detailedOrderType: 'Limit',
      } as Order,
      {
        ...mockOrder,
        orderId: 'tpsl-order',
        reduceOnly: false,
        detailedOrderType: 'Stop Market',
      } as Order,
      {
        ...mockOrder,
        orderId: 'reduce-only-order',
        reduceOnly: true,
        detailedOrderType: 'Limit',
      } as Order,
    ];

    act(() => {
      capturedCallback(orders);
    });

    await waitFor(() => {
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].orderId).toBe('regular-order');
    });
  });
});
