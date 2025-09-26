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
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Subscription Lifecycle', () => {
    it('subscribes to positions on mount with specified throttle', () => {
      // Arrange
      const throttleMs = 3000;
      mockSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ throttleMs }));

      // Assert
      expect(mockSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs,
      });
    });

    it('unsubscribes on unmount to prevent memory leaks', () => {
      // Arrange
      const mockUnsubscribe = jest.fn();
      mockSubscribe.mockReturnValue(mockUnsubscribe);

      // Act
      const { unmount } = renderHook(() => usePerpsLivePositions());
      unmount();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Position Updates', () => {
    it('updates positions and clears loading state when data arrives', async () => {
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

    it('uses no throttling by default for instant position updates', () => {
      // Arrange
      mockSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions());

      // Assert - No throttle means instant updates
      expect(mockSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs: 0,
      });
    });

    it('resubscribes when throttle value changes', () => {
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

    it('handles empty positions array without unnecessary re-renders', async () => {
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

    it('handles null updates gracefully by maintaining loading state', async () => {
      // Arrange
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() => usePerpsLivePositions());

      // Act - Send null update (indicates no cached data yet)
      act(() => {
        capturedCallback(null);
      });

      // Assert - Should maintain loading state when null is received
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: true,
      });
    });

    it('transitions from loading to loaded when receiving valid positions after null', async () => {
      // Arrange
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() => usePerpsLivePositions());
      const validPositions: Position[] = [mockPosition];

      // Act - First send null, then valid positions
      act(() => {
        capturedCallback(null);
      });

      // Assert - Still loading after null
      expect(result.current.isInitialLoading).toBe(true);

      // Act - Send valid positions
      act(() => {
        capturedCallback(validPositions);
      });

      // Assert - Should be loaded with positions
      await waitFor(() => {
        expect(result.current).toEqual({
          positions: validPositions,
          isInitialLoading: false,
        });
      });
    });

    it('replaces entire positions array on each update', async () => {
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

    it('updates position values when PnL or other fields change', async () => {
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
});
