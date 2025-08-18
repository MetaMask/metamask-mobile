import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsLiveOrders } from './index';
import type { Order } from '../../controllers/types';

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

  it('should subscribe to orders on mount', () => {
    const throttleMs = 2000;
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLiveOrders({ throttleMs }));

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs,
    });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => usePerpsLiveOrders());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update orders when callback is invoked', async () => {
    let capturedCallback: (orders: Order[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLiveOrders());

    // Initially empty
    expect(result.current).toEqual([]);

    // Simulate orders update
    const orders: Order[] = [
      mockOrder,
      { ...mockOrder, orderId: 'order-2', symbol: 'ETH-PERP' } as Order,
    ];

    act(() => {
      capturedCallback(orders);
    });

    await waitFor(() => {
      expect(result.current).toEqual(orders);
    });
  });

  it('should use default throttle value when not provided', () => {
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLiveOrders());

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 0, // Default value for orders (no throttling for instant updates)
    });
  });

  it('should handle throttle changes', () => {
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

  it('should handle empty orders array', async () => {
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
      expect(result.current).toEqual([]);
    });
  });

  it('should handle null or undefined updates gracefully', async () => {
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
    expect(result.current).toEqual([]);

    // Send undefined update
    act(() => {
      capturedCallback(undefined as unknown as Order[]);
    });

    // Should still not crash
    expect(result.current).toEqual([]);

    // Send valid update to ensure it still works
    const validOrders: Order[] = [mockOrder];

    act(() => {
      capturedCallback(validOrders);
    });

    await waitFor(() => {
      expect(result.current).toEqual(validOrders);
    });
  });

  it('should replace orders on each update', async () => {
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
      expect(result.current).toEqual(firstOrders);
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
      expect(result.current).toEqual(secondOrders);
      expect(result.current).not.toContain(mockOrder);
    });
  });
});
