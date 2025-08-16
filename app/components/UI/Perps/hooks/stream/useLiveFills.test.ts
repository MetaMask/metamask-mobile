import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useLiveFills } from './index';
import type { OrderFill } from '../../controllers/types';

// Mock the stream provider
const mockSubscribe = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    fills: {
      subscribe: mockSubscribe,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('useLiveFills', () => {
  const mockFill: OrderFill = {
    orderId: 'order-1',
    symbol: 'BTC-PERP',
    side: 'buy',
    size: '0.5',
    price: '50000',
    pnl: '0',
    direction: 'Open Long',
    fee: '25',
    feeToken: 'USDC',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should subscribe to fills on mount', () => {
    const debounceMs = 2000;
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => useLiveFills({ debounceMs }));

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      debounceMs,
    });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useLiveFills());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update fills when callback is invoked', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    // Initially empty
    expect(result.current).toEqual([]);

    // Simulate fills update
    const fills: OrderFill[] = [
      mockFill,
      { ...mockFill, orderId: 'order-2', symbol: 'ETH-PERP' },
    ];

    act(() => {
      capturedCallback(fills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(fills);
    });
  });

  it('should use default debounce value when not provided', () => {
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => useLiveFills());

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      debounceMs: 0, // Default value for fills (immediate)
    });
  });

  it('should handle debounce changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    mockSubscribe
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      ({ debounceMs }) => useLiveFills({ debounceMs }),
      {
        initialProps: { debounceMs: 2000 },
      },
    );

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      debounceMs: 2000,
    });

    // Change debounce
    rerender({ debounceMs: 3000 });

    // Should resubscribe with new debounce
    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      debounceMs: 3000,
    });
  });

  it('should handle empty fills array', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    act(() => {
      capturedCallback([]);
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it('should handle null or undefined updates gracefully', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    // Send null update (should be handled gracefully)
    act(() => {
      capturedCallback(null as unknown as OrderFill[]);
    });

    // Should not crash and fills should remain empty
    expect(result.current).toEqual([]);

    // Send undefined update
    act(() => {
      capturedCallback(undefined as unknown as OrderFill[]);
    });

    // Should still not crash
    expect(result.current).toEqual([]);

    // Send valid update to ensure it still works
    const validFills: OrderFill[] = [mockFill];

    act(() => {
      capturedCallback(validFills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(validFills);
    });
  });

  it('should replace fills on each update', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    // First update
    const firstFills: OrderFill[] = [mockFill];
    act(() => {
      capturedCallback(firstFills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(firstFills);
    });

    // Second update with different fills
    const secondFills: OrderFill[] = [
      { ...mockFill, orderId: 'order-2' },
      { ...mockFill, orderId: 'order-3' },
    ];

    act(() => {
      capturedCallback(secondFills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(secondFills);
      expect(result.current).not.toContain(mockFill);
    });
  });

  it('should handle fills with different timestamps', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    const now = Date.now();
    const fills: OrderFill[] = [
      { ...mockFill, orderId: 'order-fill-1', timestamp: now - 3000 },
      { ...mockFill, orderId: 'order-fill-2', timestamp: now - 2000 },
      { ...mockFill, orderId: 'order-fill-3', timestamp: now - 1000 },
    ];

    act(() => {
      capturedCallback(fills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(fills);
      expect(result.current).toHaveLength(3);
    });
  });

  it('should handle fills for different symbols', async () => {
    let capturedCallback: (fills: OrderFill[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveFills());

    const fills: OrderFill[] = [
      { ...mockFill, orderId: 'order-fill-1', symbol: 'BTC-PERP' },
      { ...mockFill, orderId: 'order-2', symbol: 'ETH-PERP' },
      { ...mockFill, orderId: 'order-fill-3', symbol: 'SOL-PERP' },
    ];

    act(() => {
      capturedCallback(fills);
    });

    await waitFor(() => {
      expect(result.current).toEqual(fills);
      const symbols = result.current.map((f) => f.symbol);
      expect(symbols).toContain('BTC-PERP');
      expect(symbols).toContain('ETH-PERP');
      expect(symbols).toContain('SOL-PERP');
    });
  });
});
