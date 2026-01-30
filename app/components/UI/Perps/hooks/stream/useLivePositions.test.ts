import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import {
  usePerpsLivePositions,
  enrichPositionsWithLivePnL,
} from './usePerpsLivePositions';
import type { Position, PriceUpdate } from '../../controllers/types';

// Mock the stream provider
const mockPositionsSubscribe = jest.fn();
const mockPricesSubscribe = jest.fn();

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    positions: {
      subscribe: mockPositionsSubscribe,
    },
    prices: {
      subscribe: mockPricesSubscribe,
    },
  })),
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLivePositions', () => {
  const mockPosition: Position = {
    symbol: 'BTC-PERP',
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
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ throttleMs }));

      // Assert
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs,
      });
    });

    it('does NOT subscribe to prices by default (useLivePnl: false)', () => {
      // Arrange
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions());

      // Assert - prices should NOT be subscribed
      expect(mockPricesSubscribe).not.toHaveBeenCalled();
    });

    it('subscribes to prices only when useLivePnl: true', () => {
      // Arrange
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions({ useLivePnl: true }));

      // Assert
      expect(mockPricesSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs: 0,
      });
    });

    it('unsubscribes from positions on unmount', () => {
      // Arrange
      const mockPositionsUnsubscribe = jest.fn();
      mockPositionsSubscribe.mockReturnValue(mockPositionsUnsubscribe);

      // Act
      const { unmount } = renderHook(() => usePerpsLivePositions());
      unmount();

      // Assert
      expect(mockPositionsUnsubscribe).toHaveBeenCalled();
    });

    it('unsubscribes from positions and prices on unmount when useLivePnl: true', () => {
      // Arrange
      const mockPositionsUnsubscribe = jest.fn();
      const mockPricesUnsubscribe = jest.fn();
      mockPositionsSubscribe.mockReturnValue(mockPositionsUnsubscribe);
      mockPricesSubscribe.mockReturnValue(mockPricesUnsubscribe);

      // Act
      const { unmount } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );
      unmount();

      // Assert
      expect(mockPositionsUnsubscribe).toHaveBeenCalled();
      expect(mockPricesUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Position Updates', () => {
    it('updates positions and clears loading state when data arrives', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      // Initially empty with loading state
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: true,
      });

      // Simulate positions update
      const positions: Position[] = [
        mockPosition,
        { ...mockPosition, symbol: 'ETH-PERP', size: '10.0' },
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
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockPricesSubscribe.mockReturnValue(jest.fn());

      // Act
      renderHook(() => usePerpsLivePositions());

      // Assert
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs: 0,
      });
    });

    it('resubscribes when throttle value changes', () => {
      const mockUnsubscribe1 = jest.fn();
      const mockUnsubscribe2 = jest.fn();
      mockPricesSubscribe.mockReturnValue(jest.fn());

      mockPositionsSubscribe
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const { rerender } = renderHook(
        ({ throttleMs }) => usePerpsLivePositions({ throttleMs }),
        {
          initialProps: { throttleMs: 0 },
        },
      );

      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs: 0,
      });

      // Change throttle
      rerender({ throttleMs: 2000 });

      // Verify old subscription cleaned up and new one created
      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockPositionsSubscribe).toHaveBeenCalledWith({
        callback: expect.any(Function),
        throttleMs: 2000,
      });
    });

    it('handles empty positions array without unnecessary re-renders', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

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
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

      // Act
      act(() => {
        capturedCallback(null);
      });

      // Assert
      expect(result.current).toEqual({
        positions: [],
        isInitialLoading: true,
      });
    });

    it('transitions from loading to loaded when receiving valid positions after null', async () => {
      // Arrange
      let capturedCallback: (positions: Position[] | null) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());
      const validPositions: Position[] = [mockPosition];

      // Act
      act(() => {
        capturedCallback(null);
      });

      expect(result.current.isInitialLoading).toBe(true);

      act(() => {
        capturedCallback(validPositions);
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toEqual({
          positions: validPositions,
          isInitialLoading: false,
        });
      });
    });

    it('replaces entire positions array on each update', async () => {
      let capturedCallback: (positions: Position[]) => void = jest.fn();
      mockPositionsSubscribe.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });
      mockPricesSubscribe.mockReturnValue(jest.fn());

      const { result } = renderHook(() => usePerpsLivePositions());

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

      const secondPositions: Position[] = [
        { ...mockPosition, symbol: 'ETH-PERP', size: '5.0' },
        { ...mockPosition, symbol: 'SOL-PERP', size: '20.0' },
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
  });

  describe('Live PnL Calculations', () => {
    it('recalculates PnL when price updates arrive', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '5000',
      };

      act(() => {
        positionsCallback([position]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '52000',
          markPrice: '52000',
          timestamp: Date.now(),
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('2000');
        expect(updatedPosition.returnOnEquity).toBe('0.4');
      });
    });

    it('uses price over mark price when available', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '10000',
      };

      act(() => {
        positionsCallback([position]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '51000',
          markPrice: '51500',
          timestamp: Date.now(),
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('1000');
      });
    });

    it('falls back to mid price when mark price is unavailable', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '1.0',
        marginUsed: '10000',
      };

      act(() => {
        positionsCallback([position]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '51000',
          timestamp: Date.now(),
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('1000');
      });
    });

    it('handles short positions with negative size', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const shortPosition: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '-1.0',
        marginUsed: '5000',
      };

      act(() => {
        positionsCallback([shortPosition]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '48000',
          markPrice: '48000',
          timestamp: Date.now(),
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('2000');
        expect(updatedPosition.returnOnEquity).toBe('0.4');
      });
    });

    it('preserves original PnL when price data is unavailable for coin', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        symbol: 'BTC-PERP',
        unrealizedPnl: '1000',
        returnOnEquity: '0.2',
      };

      act(() => {
        positionsCallback([position]);
      });

      const priceUpdate: Record<string, PriceUpdate> = {
        'ETH-PERP': {
          symbol: 'ETH-PERP',
          price: '3000',
          timestamp: Date.now(),
        },
      };

      act(() => {
        pricesCallback(priceUpdate);
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('1000');
        expect(updatedPosition.returnOnEquity).toBe('0.2');
      });
    });

    it('preserves original PnL when price data is empty', async () => {
      let positionsCallback: (positions: Position[]) => void = jest.fn();
      let pricesCallback: (prices: Record<string, PriceUpdate>) => void =
        jest.fn();

      mockPositionsSubscribe.mockImplementation((params) => {
        positionsCallback = params.callback;
        return jest.fn();
      });

      mockPricesSubscribe.mockImplementation((params) => {
        pricesCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLivePositions({ useLivePnl: true }),
      );

      const position: Position = {
        ...mockPosition,
        unrealizedPnl: '1000',
        returnOnEquity: '0.2',
      };

      act(() => {
        positionsCallback([position]);
      });

      act(() => {
        pricesCallback({});
      });

      await waitFor(() => {
        const updatedPosition = result.current.positions[0];
        expect(updatedPosition.unrealizedPnl).toBe('1000');
        expect(updatedPosition.returnOnEquity).toBe('0.2');
      });
    });
  });

  describe('enrichPositionsWithLivePnL', () => {
    const basePriceData: Record<string, PriceUpdate> = {
      'BTC-PERP': {
        symbol: 'BTC-PERP',
        price: '52000',
        markPrice: '52000',
        timestamp: Date.now(),
      },
    };

    it('calculates PnL using mark price and size', () => {
      const positions: Position[] = [
        {
          ...mockPosition,
          entryPrice: '50000',
          size: '1.0',
          marginUsed: '5000',
        },
      ];

      const enriched = enrichPositionsWithLivePnL(positions, basePriceData);

      expect(enriched[0].unrealizedPnl).toBe('2000');
      expect(enriched[0].returnOnEquity).toBe('0.4');
    });

    it('returns positions unchanged when price data is empty', () => {
      const positions: Position[] = [mockPosition];

      const enriched = enrichPositionsWithLivePnL(positions, {});

      expect(enriched).toBe(positions);
    });

    it('returns position unchanged when price for coin is missing', () => {
      const position: Position = {
        ...mockPosition,
        symbol: 'ETH-PERP',
        unrealizedPnl: '500',
      };

      const enriched = enrichPositionsWithLivePnL([position], basePriceData);

      expect(enriched[0]).toEqual(position);
    });

    it('returns position unchanged when mark price is invalid', () => {
      const position: Position = {
        ...mockPosition,
        unrealizedPnl: '500',
      };

      const invalidPriceData: Record<string, PriceUpdate> = {
        'BTC-PERP': {
          symbol: 'BTC-PERP',
          price: '0',
          timestamp: Date.now(),
        },
      };

      const enriched = enrichPositionsWithLivePnL([position], invalidPriceData);

      expect(enriched[0]).toEqual(position);
    });

    it('returns position unchanged when entry price is NaN', () => {
      const position: Position = {
        ...mockPosition,
        entryPrice: 'invalid',
        unrealizedPnl: '500',
      };

      const enriched = enrichPositionsWithLivePnL([position], basePriceData);

      expect(enriched[0]).toEqual(position);
    });

    it('returns position unchanged when size is NaN', () => {
      const position: Position = {
        ...mockPosition,
        size: 'invalid',
        unrealizedPnl: '500',
      };

      const enriched = enrichPositionsWithLivePnL([position], basePriceData);

      expect(enriched[0]).toEqual(position);
    });

    it('calculates PnL even when margin is NaN (uses leverage instead)', () => {
      const position: Position = {
        ...mockPosition,
        entryPrice: '50000',
        size: '1.0',
        marginUsed: 'invalid',
        leverage: {
          type: 'isolated',
          value: 10,
        },
      };

      const enriched = enrichPositionsWithLivePnL([position], basePriceData);

      expect(enriched[0].unrealizedPnl).toBe('2000');
      expect(enriched[0].returnOnEquity).toBe('0.4');
    });

    it('handles multiple positions with mixed price availability', () => {
      const positions: Position[] = [
        {
          ...mockPosition,
          symbol: 'BTC-PERP',
          entryPrice: '50000',
          size: '1.0',
          marginUsed: '5000',
        },
        {
          ...mockPosition,
          symbol: 'ETH-PERP',
          unrealizedPnl: '300',
        },
      ];

      const enriched = enrichPositionsWithLivePnL(positions, basePriceData);

      expect(enriched[0].unrealizedPnl).toBe('2000');
      expect(enriched[1].unrealizedPnl).toBe('300');
    });
  });
});
