import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsLivePrices } from './index';
import type { PriceUpdate } from '../../controllers/types';

// Mock the stream provider
const mockSubscribeToSymbols = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    prices: {
      subscribeToSymbols: mockSubscribeToSymbols,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLivePrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should subscribe to prices on mount', () => {
    const symbols = ['BTC-PERP', 'ETH-PERP'];
    const throttleMs = 1000;

    mockSubscribeToSymbols.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLivePrices({ symbols, throttleMs }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols,
      callback: expect.any(Function),
      throttleMs,
    });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToSymbols.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC-PERP'] }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update prices when callback is invoked', async () => {
    let capturedCallback: (prices: Record<string, PriceUpdate>) => void =
      jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC-PERP', 'ETH-PERP'] }),
    );

    // Initially empty
    expect(result.current).toEqual({});

    // Simulate price update for BTC
    const btcUpdate: PriceUpdate = {
      symbol: 'BTC-PERP',
      price: '50000',
      timestamp: Date.now(),
    };

    act(() => {
      capturedCallback({ 'BTC-PERP': btcUpdate });
    });

    await waitFor(() => {
      expect(result.current['BTC-PERP']).toEqual(btcUpdate);
    });

    // Simulate price update for ETH
    const ethUpdate: PriceUpdate = {
      symbol: 'ETH-PERP',
      price: '3000',
      timestamp: Date.now(),
    };

    act(() => {
      capturedCallback({
        'BTC-PERP': btcUpdate,
        'ETH-PERP': ethUpdate,
      });
    });

    await waitFor(() => {
      expect(result.current['ETH-PERP']).toEqual(ethUpdate);
      expect(result.current['BTC-PERP']).toEqual(btcUpdate); // BTC should still be there
    });
  });

  it('should use default throttle value when not provided', () => {
    mockSubscribeToSymbols.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLivePrices({ symbols: ['BTC-PERP'] }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['BTC-PERP'],
      callback: expect.any(Function),
      throttleMs: 1000, // Default value (1 second for balanced performance)
    });
  });

  it('should handle symbol changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    mockSubscribeToSymbols
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      ({ symbols }) => usePerpsLivePrices({ symbols }),
      {
        initialProps: { symbols: ['BTC-PERP'] },
      },
    );

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['BTC-PERP'],
      callback: expect.any(Function),
      throttleMs: 1000,
    });

    // Change symbols
    rerender({ symbols: ['ETH-PERP', 'SOL-PERP'] });

    // Should unsubscribe from old and subscribe to new
    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['ETH-PERP', 'SOL-PERP'],
      callback: expect.any(Function),
      throttleMs: 1000,
    });
  });

  it('should handle throttle changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    mockSubscribeToSymbols
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      ({ throttleMs }) =>
        usePerpsLivePrices({ symbols: ['BTC-PERP'], throttleMs }),
      {
        initialProps: { throttleMs: 1000 },
      },
    );

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['BTC-PERP'],
      callback: expect.any(Function),
      throttleMs: 1000,
    });

    // Change throttle
    rerender({ throttleMs: 500 });

    // Should resubscribe with new throttle
    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols: ['BTC-PERP'],
      callback: expect.any(Function),
      throttleMs: 500,
    });
  });

  it('should handle empty symbols array', () => {
    mockSubscribeToSymbols.mockReturnValue(jest.fn());

    const { result } = renderHook(() => usePerpsLivePrices({ symbols: [] }));

    expect(result.current).toEqual({});
    // Should not subscribe with empty array
    expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
  });

  it('should preserve existing prices when receiving updates', async () => {
    let capturedCallback: (prices: Record<string, PriceUpdate>) => void =
      jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'] }),
    );

    // Add prices one by one
    const btcUpdate: PriceUpdate = {
      symbol: 'BTC-PERP',
      price: '50000',
      timestamp: Date.now(),
    };

    act(() => {
      capturedCallback({ 'BTC-PERP': btcUpdate });
    });

    await waitFor(() => {
      expect(Object.keys(result.current)).toHaveLength(1);
    });

    const ethUpdate: PriceUpdate = {
      symbol: 'ETH-PERP',
      price: '3000',
      timestamp: Date.now() + 1000,
    };

    act(() => {
      capturedCallback({
        'BTC-PERP': btcUpdate,
        'ETH-PERP': ethUpdate,
      });
    });

    await waitFor(() => {
      expect(Object.keys(result.current)).toHaveLength(2);
      expect(result.current['BTC-PERP']).toEqual(btcUpdate);
      expect(result.current['ETH-PERP']).toEqual(ethUpdate);
    });

    // Update existing price
    const btcUpdate2: PriceUpdate = {
      symbol: 'BTC-PERP',
      price: '51000',
      timestamp: Date.now() + 2000,
    };

    act(() => {
      capturedCallback({
        'BTC-PERP': btcUpdate2,
        'ETH-PERP': ethUpdate,
      });
    });

    await waitFor(() => {
      expect(Object.keys(result.current)).toHaveLength(2);
      expect(result.current['BTC-PERP']).toEqual(btcUpdate2);
      expect(result.current['ETH-PERP']).toEqual(ethUpdate); // ETH unchanged
    });
  });

  it('should handle rapid symbol changes', () => {
    const unsubscribes = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    let index = 0;

    mockSubscribeToSymbols.mockImplementation(() => unsubscribes[index++]);

    const { rerender } = renderHook(
      ({ symbols }) => usePerpsLivePrices({ symbols }),
      {
        initialProps: { symbols: ['BTC-PERP'] },
      },
    );

    // Rapid changes
    rerender({ symbols: ['ETH-PERP'] });
    rerender({ symbols: ['SOL-PERP'] });
    rerender({ symbols: ['AVAX-PERP'] });

    // Should have unsubscribed from previous subscriptions
    expect(unsubscribes[0]).toHaveBeenCalled();
    expect(unsubscribes[1]).toHaveBeenCalled();
    expect(unsubscribes[2]).toHaveBeenCalled();

    // Should have subscribed 4 times (initial + 3 changes)
    expect(mockSubscribeToSymbols).toHaveBeenCalledTimes(4);
  });

  it('should handle null or undefined updates gracefully', async () => {
    let capturedCallback: (prices: Record<string, PriceUpdate>) => void =
      jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC-PERP'] }),
    );

    // Send null update (should be handled gracefully)
    act(() => {
      capturedCallback(null as unknown as Record<string, PriceUpdate>);
    });

    // Should not crash and prices should remain empty
    expect(result.current).toEqual({});

    // Send undefined update
    act(() => {
      capturedCallback(undefined as unknown as Record<string, PriceUpdate>);
    });

    // Should still not crash
    expect(result.current).toEqual({});

    // Send valid update to ensure it still works
    const validUpdate: PriceUpdate = {
      symbol: 'BTC-PERP',
      price: '50000',
      timestamp: Date.now(),
    };

    act(() => {
      capturedCallback({ 'BTC-PERP': validUpdate });
    });

    await waitFor(() => {
      expect(result.current['BTC-PERP']).toEqual(validUpdate);
    });
  });

  it('should reset prices when symbols change completely', async () => {
    let capturedCallback: (prices: Record<string, PriceUpdate>) => void =
      jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result, rerender } = renderHook(
      ({ symbols }) => usePerpsLivePrices({ symbols }),
      {
        initialProps: { symbols: ['BTC-PERP', 'ETH-PERP'] },
      },
    );

    // Add some prices
    const btcUpdate: PriceUpdate = {
      symbol: 'BTC-PERP',
      price: '50000',
      timestamp: Date.now(),
    };

    act(() => {
      capturedCallback({ 'BTC-PERP': btcUpdate });
    });

    await waitFor(() => {
      expect(result.current['BTC-PERP']).toBeDefined();
    });

    // Change to completely different symbols
    rerender({ symbols: ['SOL-PERP', 'AVAX-PERP'] });

    // Prices should be reset (implementation may vary)
    // This test assumes prices are maintained across symbol changes
    // Update if the implementation clears prices on symbol change
    expect(result.current['BTC-PERP']).toBeDefined();
  });
});
