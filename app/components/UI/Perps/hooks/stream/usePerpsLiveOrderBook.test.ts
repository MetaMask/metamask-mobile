import { renderHook, act } from '@testing-library/react-native';
import { usePerpsLiveOrderBook } from './usePerpsLiveOrderBook';
import Engine from '../../../../../core/Engine';
import type { OrderBookData } from '../../controllers/types';

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToOrderBook: jest.fn(),
    },
  },
}));

// Mock DevLogger to suppress logs in tests
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

describe('usePerpsLiveOrderBook', () => {
  const mockOrderBookData: OrderBookData = {
    bids: [
      {
        price: '50000',
        size: '1.5',
        total: '1.5',
        notional: '75000',
        totalNotional: '75000',
      },
      {
        price: '49900',
        size: '2.0',
        total: '3.5',
        notional: '99800',
        totalNotional: '174800',
      },
    ],
    asks: [
      {
        price: '50100',
        size: '1.2',
        total: '1.2',
        notional: '60120',
        totalNotional: '60120',
      },
      {
        price: '50200',
        size: '1.8',
        total: '3.0',
        notional: '90360',
        totalNotional: '150480',
      },
    ],
    spread: '100',
    spreadPercentage: '0.2',
    midPrice: '50050',
    lastUpdated: Date.now(),
    maxTotal: '3.5',
  };

  const mockSubscribeToOrderBook = Engine.context.PerpsController
    .subscribeToOrderBook as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('initialization and subscription', () => {
    it('subscribes to order book on mount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledWith({
        symbol: 'BTC',
        levels: 10,
        nSigFigs: 5,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('subscribes with custom options', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'ETH',
          levels: 20,
          nSigFigs: 3,
          throttleMs: 200,
        }),
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledWith({
        symbol: 'ETH',
        levels: 20,
        nSigFigs: 3,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('returns initial loading state', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      expect(result.current.orderBook).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('enabled flag behavior', () => {
    it('does not subscribe when enabled is false', () => {
      renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          enabled: false,
        }),
      );

      expect(mockSubscribeToOrderBook).not.toHaveBeenCalled();
    });

    it('returns not loading when disabled', () => {
      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          enabled: false,
        }),
      );

      expect(result.current.orderBook).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('resubscribes when enabled changes from false to true', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ enabled }) =>
          usePerpsLiveOrderBook({
            symbol: 'BTC',
            enabled,
          }),
        { initialProps: { enabled: false } },
      );

      expect(mockSubscribeToOrderBook).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockSubscribeToOrderBook).toHaveBeenCalled();
    });

    it('unsubscribes when enabled changes from true to false', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ enabled }) =>
          usePerpsLiveOrderBook({
            symbol: 'BTC',
            enabled,
          }),
        { initialProps: { enabled: true } },
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalled();

      rerender({ enabled: false });

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('empty symbol handling', () => {
    it('does not subscribe when symbol is empty', () => {
      renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: '',
        }),
      );

      expect(mockSubscribeToOrderBook).not.toHaveBeenCalled();
    });

    it('returns not loading when symbol is empty', () => {
      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: '',
        }),
      );

      expect(result.current.orderBook).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('data updates and throttling', () => {
    it('updates order book data immediately when throttle time has passed', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          throttleMs: 100,
        }),
      );

      act(() => {
        capturedCallback(mockOrderBookData);
      });

      expect(result.current.orderBook).toEqual(mockOrderBookData);
      expect(result.current.isLoading).toBe(false);
    });

    it('throttles rapid updates', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          throttleMs: 100,
        }),
      );

      const firstUpdate = { ...mockOrderBookData, spread: '100' };
      const secondUpdate = { ...mockOrderBookData, spread: '110' };

      act(() => {
        capturedCallback(firstUpdate);
      });

      expect(result.current.orderBook).toEqual(firstUpdate);

      // Second update immediately after (should be throttled)
      act(() => {
        capturedCallback(secondUpdate);
      });

      // Should still show first update
      expect(result.current.orderBook).toEqual(firstUpdate);

      // Advance time past throttle
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should now show second update
      expect(result.current.orderBook).toEqual(secondUpdate);
    });

    it('applies pending update after throttle period', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          throttleMs: 100,
        }),
      );

      const firstUpdate = { ...mockOrderBookData, spread: '100' };
      const secondUpdate = { ...mockOrderBookData, spread: '110' };
      const thirdUpdate = { ...mockOrderBookData, spread: '120' };

      act(() => {
        capturedCallback(firstUpdate);
      });

      // Multiple rapid updates (only last should be applied)
      act(() => {
        capturedCallback(secondUpdate);
        capturedCallback(thirdUpdate);
      });

      // Advance time to apply pending update
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should show the last update
      expect(result.current.orderBook).toEqual(thirdUpdate);
    });

    it('uses default throttle of 100ms', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      const firstUpdate = { ...mockOrderBookData, spread: '100' };
      const secondUpdate = { ...mockOrderBookData, spread: '110' };

      act(() => {
        capturedCallback(firstUpdate);
        capturedCallback(secondUpdate);
      });

      // First update applied immediately
      expect(result.current.orderBook).toEqual(firstUpdate);

      // Advance default throttle time
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Second update applied
      expect(result.current.orderBook).toEqual(secondUpdate);
    });
  });

  describe('error handling', () => {
    it('handles subscription errors via onError callback', () => {
      const subscriptionError = new Error('WebSocket connection failed');
      let capturedOnError: ((err: Error) => void) | undefined;

      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedOnError = params.onError;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      act(() => {
        if (capturedOnError) {
          capturedOnError(subscriptionError);
        }
      });

      expect(result.current.error).toEqual(subscriptionError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.orderBook).toBeNull();
    });

    it('handles setup errors during subscription', () => {
      const setupError = new Error('Controller not initialized');
      mockSubscribeToOrderBook.mockImplementation(() => {
        throw setupError;
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      expect(result.current.error).toEqual(setupError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.orderBook).toBeNull();
    });

    it('converts non-Error objects to Error during setup', () => {
      mockSubscribeToOrderBook.mockImplementation(() => {
        throw 'String error message';
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error message');
      expect(result.current.isLoading).toBe(false);
    });

    it('resets error when resubscribing', () => {
      const subscriptionError = new Error('WebSocket connection failed');
      let capturedOnError: ((err: Error) => void) | undefined;

      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedOnError = params.onError;
        return jest.fn();
      });

      const { result, rerender } = renderHook(
        ({ symbol }) =>
          usePerpsLiveOrderBook({
            symbol,
          }),
        { initialProps: { symbol: 'BTC' } },
      );

      act(() => {
        if (capturedOnError) {
          capturedOnError(subscriptionError);
        }
      });

      expect(result.current.error).toEqual(subscriptionError);

      // Resubscribe with different symbol
      rerender({ symbol: 'ETH' });

      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('cleanup and unsubscription', () => {
    it('unsubscribes on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('clears throttle timer on unmount', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return mockUnsubscribe;
      });

      const { unmount } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          throttleMs: 100,
        }),
      );

      const firstUpdate = { ...mockOrderBookData, spread: '100' };
      const secondUpdate = { ...mockOrderBookData, spread: '110' };

      act(() => {
        capturedCallback(firstUpdate);
        capturedCallback(secondUpdate);
      });

      // Unmount before throttle timer fires
      unmount();

      // Advance time (timer should be cleared, so no state updates)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('clears pending updates on unmount', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return mockUnsubscribe;
      });

      const { result, unmount } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
          throttleMs: 100,
        }),
      );

      const firstUpdate = { ...mockOrderBookData, spread: '100' };
      const secondUpdate = { ...mockOrderBookData, spread: '110' };

      act(() => {
        capturedCallback(firstUpdate);
        capturedCallback(secondUpdate);
      });

      const orderBookBeforeUnmount = result.current.orderBook;

      unmount();

      // Verify no state changes after unmount
      expect(result.current.orderBook).toBe(orderBookBeforeUnmount);
    });
  });

  describe('parameter changes', () => {
    it('resubscribes when symbol changes', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ symbol }) =>
          usePerpsLiveOrderBook({
            symbol,
          }),
        { initialProps: { symbol: 'BTC' } },
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToOrderBook).toHaveBeenLastCalledWith({
        symbol: 'BTC',
        levels: 10,
        nSigFigs: 5,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });

      rerender({ symbol: 'ETH' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToOrderBook).toHaveBeenLastCalledWith({
        symbol: 'ETH',
        levels: 10,
        nSigFigs: 5,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('resubscribes when levels change', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ levels }) =>
          usePerpsLiveOrderBook({
            symbol: 'BTC',
            levels,
          }),
        { initialProps: { levels: 10 } },
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(1);

      rerender({ levels: 20 });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToOrderBook).toHaveBeenLastCalledWith({
        symbol: 'BTC',
        levels: 20,
        nSigFigs: 5,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('resubscribes when nSigFigs change', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ nSigFigs }) =>
          usePerpsLiveOrderBook({
            symbol: 'BTC',
            nSigFigs,
          }),
        { initialProps: { nSigFigs: 5 } },
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(1);

      rerender({ nSigFigs: 3 });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToOrderBook).toHaveBeenLastCalledWith({
        symbol: 'BTC',
        levels: 10,
        nSigFigs: 3,
        callback: expect.any(Function),
        onError: expect.any(Function),
      });
    });

    it('resets state when symbol changes', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result, rerender } = renderHook(
        ({ symbol }) =>
          usePerpsLiveOrderBook({
            symbol,
          }),
        { initialProps: { symbol: 'BTC' } },
      );

      act(() => {
        capturedCallback(mockOrderBookData);
      });

      expect(result.current.orderBook).toEqual(mockOrderBookData);
      expect(result.current.isLoading).toBe(false);

      rerender({ symbol: 'ETH' });

      // State reset for new symbol
      expect(result.current.isLoading).toBe(true);
    });

    it('resubscribes when throttleMs changes', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ throttleMs }) =>
          usePerpsLiveOrderBook({
            symbol: 'BTC',
            throttleMs,
          }),
        { initialProps: { throttleMs: 100 } },
      );

      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(1);

      rerender({ throttleMs: 200 });

      // throttleMs affects applyUpdate callback, which triggers resubscription
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(2);
    });
  });

  describe('return value stability', () => {
    it('returns stable object via useMemo', () => {
      mockSubscribeToOrderBook.mockReturnValue(jest.fn());

      const { result, rerender } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      const firstReturn = result.current;

      // Rerender without changing state - pass undefined to simulate no-change rerender
      rerender(undefined);

      // Should be same object reference
      expect(result.current).toBe(firstReturn);
    });

    it('returns new object when state changes', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      const initialReturn = result.current;

      act(() => {
        capturedCallback(mockOrderBookData);
      });

      // Should be different object reference after state change
      expect(result.current).not.toBe(initialReturn);
      expect(result.current.orderBook).toEqual(mockOrderBookData);
    });
  });

  describe('edge cases', () => {
    it('handles multiple rapid parameter changes', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToOrderBook.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ symbol }) =>
          usePerpsLiveOrderBook({
            symbol,
          }),
        { initialProps: { symbol: 'BTC' } },
      );

      rerender({ symbol: 'ETH' });
      rerender({ symbol: 'SOL' });
      rerender({ symbol: 'AVAX' });

      // Should unsubscribe 3 times (once for each change)
      expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
      // Should subscribe 4 times (initial + 3 changes)
      expect(mockSubscribeToOrderBook).toHaveBeenCalledTimes(4);
    });

    it('handles unsubscribe function that is null', () => {
      mockSubscribeToOrderBook.mockReturnValue(null);

      const { unmount } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('applies data update that sets isLoading to false', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      expect(result.current.isLoading).toBe(true);

      act(() => {
        capturedCallback(mockOrderBookData);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('handles order book with empty bids and asks', () => {
      let capturedCallback: (data: OrderBookData) => void = jest.fn();
      mockSubscribeToOrderBook.mockImplementation((params) => {
        capturedCallback = params.callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        usePerpsLiveOrderBook({
          symbol: 'BTC',
        }),
      );

      const emptyOrderBook: OrderBookData = {
        bids: [],
        asks: [],
        spread: '0',
        spreadPercentage: '0',
        midPrice: '0',
        lastUpdated: Date.now(),
        maxTotal: '0',
      };

      act(() => {
        capturedCallback(emptyOrderBook);
      });

      expect(result.current.orderBook).toEqual(emptyOrderBook);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
