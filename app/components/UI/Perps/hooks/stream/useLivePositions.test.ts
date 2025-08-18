import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsLivePositions } from './index';
import type { Position } from '../../controllers/types';

// Mock the stream provider
const mockSubscribe = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    positions: {
      subscribe: mockSubscribe,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLivePositions', () => {
  const mockPosition: Position = {
    coin: 'BTC-PERP',
    size: '1.0',
    entryPrice: '50000',
    positionValue: '50000',
    unrealizedPnl: '1000',
    marginUsed: '5000',
    leverage: {
      type: 'isolated',
      value: 10,
    },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '20',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should subscribe to positions on mount', () => {
    const throttleMs = 3000;
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLivePositions({ throttleMs }));

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs,
    });
  });

  it('should unsubscribe on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => usePerpsLivePositions());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update positions when callback is invoked', async () => {
    let capturedCallback: (positions: Position[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLivePositions());

    // Initially empty with loading state
    expect(result.current).toEqual({
      positions: [],
      isInitialLoading: true,
    });

    // Simulate positions update
    const positions: Position[] = [
      mockPosition,
      { ...mockPosition, coin: 'ETH-PERP', size: '10.0' },
    ];

    act(() => {
      capturedCallback(positions);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        positions,
        isInitialLoading: false,
      });
    });
  });

  it('should use default throttle value when not provided', () => {
    mockSubscribe.mockReturnValue(jest.fn());

    renderHook(() => usePerpsLivePositions());

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 0, // Default value for positions (no throttling for instant updates)
    });
  });

  it('should handle throttle changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    mockSubscribe
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      ({ throttleMs }) => usePerpsLivePositions({ throttleMs }),
      {
        initialProps: { throttleMs: 0 },
      },
    );

    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 0,
    });

    // Change throttle
    rerender({ throttleMs: 2000 });

    // Should resubscribe with new throttle
    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: 2000,
    });
  });

  it('should handle empty positions array', async () => {
    let capturedCallback: (positions: Position[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLivePositions());

    act(() => {
      capturedCallback([]);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: false,
      });
    });
  });

  it('should handle null or undefined updates gracefully', async () => {
    let capturedCallback: (positions: Position[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLivePositions());

    // Send null update (should be handled gracefully)
    act(() => {
      capturedCallback(null as unknown as Position[]);
    });

    // Should not crash and positions should remain empty
    expect(result.current).toEqual({
      positions: [],
      isInitialLoading: true,
    });

    // Send undefined update
    act(() => {
      capturedCallback(undefined as unknown as Position[]);
    });

    // Should still not crash
    expect(result.current).toEqual({
      positions: [],
      isInitialLoading: true,
    });

    // Send valid update to ensure it still works
    const validPositions: Position[] = [mockPosition];

    act(() => {
      capturedCallback(validPositions);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        positions: validPositions,
        isInitialLoading: false,
      });
    });
  });

  it('should replace positions on each update', async () => {
    let capturedCallback: (positions: Position[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLivePositions());

    // First update
    const firstPositions: Position[] = [mockPosition];
    act(() => {
      capturedCallback(firstPositions);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        positions: firstPositions,
        isInitialLoading: false,
      });
    });

    // Second update with different positions
    const secondPositions: Position[] = [
      { ...mockPosition, coin: 'ETH-PERP', size: '5.0' },
      { ...mockPosition, coin: 'SOL-PERP', size: '20.0' },
    ];

    act(() => {
      capturedCallback(secondPositions);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        positions: secondPositions,
        isInitialLoading: false,
      });
      expect(result.current.positions).not.toContain(mockPosition);
    });
  });

  it('should handle position updates with changed values', async () => {
    let capturedCallback: (positions: Position[]) => void = jest.fn();
    mockSubscribe.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const { result } = renderHook(() => usePerpsLivePositions());

    // Initial position
    const initialPosition: Position = { ...mockPosition };
    act(() => {
      capturedCallback([initialPosition]);
    });

    await waitFor(() => {
      expect(result.current.positions[0].unrealizedPnl).toBe('1000');
    });

    // Update with changed PnL
    const updatedPosition: Position = {
      ...mockPosition,
      unrealizedPnl: '2000',
      positionValue: '52000',
    };

    act(() => {
      capturedCallback([updatedPosition]);
    });

    await waitFor(() => {
      expect(result.current.positions[0].unrealizedPnl).toBe('2000');
      expect(result.current.positions[0].positionValue).toBe('52000');
    });
  });
});
