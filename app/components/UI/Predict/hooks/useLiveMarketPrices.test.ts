import { renderHook, act } from '@testing-library/react-native';
import {
  __resetLiveMarketPricesCacheForTest,
  useLiveMarketPrices,
  useLiveMarketPricesSubscription,
  useLivePrice,
  useLivePrices,
} from './useLiveMarketPrices';
import Engine from '../../../../core/Engine';
import { PriceUpdate } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToMarketPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

describe('useLiveMarketPrices', () => {
  const mockSubscribeToMarketPrices = Engine.context.PredictController
    .subscribeToMarketPrices as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetLiveMarketPricesCacheForTest();

    mockSubscribeToMarketPrices.mockReturnValue(mockUnsubscribe);
    mockGetConnectionStatus.mockReturnValue({
      sportsConnected: false,
      marketConnected: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscription management', () => {
    it('subscribes to price updates when tokenIds are provided', () => {
      renderHook(() => useLiveMarketPrices(['token1', 'token2']));

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['token1', 'token2'],
        expect.any(Function),
      );
    });

    it('does not subscribe when tokenIds is empty', () => {
      renderHook(() => useLiveMarketPrices([]));

      expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
    });

    it('does not subscribe when enabled is false', () => {
      renderHook(() =>
        useLiveMarketPrices(['token1', 'token2'], { enabled: false }),
      );

      expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useLiveMarketPrices(['token1', 'token2']),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when tokenIds change', () => {
      const { rerender } = renderHook(
        ({ tokenIds }) => useLiveMarketPrices(tokenIds),
        { initialProps: { tokenIds: ['token1'] } },
      );

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(1);

      rerender({ tokenIds: ['token1', 'token2'] });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(2);
    });

    it('does not resubscribe when tokenIds order changes but content is same', () => {
      const { rerender } = renderHook(
        ({ tokenIds }) => useLiveMarketPrices(tokenIds),
        { initialProps: { tokenIds: ['token2', 'token1'] } },
      );

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(1);

      rerender({ tokenIds: ['token1', 'token2'] });

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('price update handling', () => {
    it('updates prices map when callback is invoked', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.prices.size).toBe(0);

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.prices.get('token1')).toEqual({
        tokenId: 'token1',
        price: 0.75,
        bestBid: 0.74,
        bestAsk: 0.76,
      });
    });

    it('accumulates prices from multiple updates', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() =>
        useLiveMarketPrices(['token1', 'token2']),
      );

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      act(() => {
        capturedCallback([
          { tokenId: 'token2', price: 0.25, bestBid: 0.24, bestAsk: 0.26 },
        ]);
      });

      expect(result.current.prices.size).toBe(2);
      expect(result.current.prices.get('token1')?.price).toBe(0.75);
      expect(result.current.prices.get('token2')?.price).toBe(0.25);
    });

    it('overwrites previous price for same token', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.8, bestBid: 0.79, bestAsk: 0.81 },
        ]);
      });

      expect(result.current.prices.get('token1')?.price).toBe(0.8);
    });

    it('updates lastUpdateTime when price update is received', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const mockNow = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.lastUpdateTime).toBeNull();

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.lastUpdateTime).toBe(mockNow);
    });
  });

  describe('getPrice helper', () => {
    it('returns price for existing token', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.getPrice('token1')?.price).toBe(0.75);
    });

    it('returns undefined for non-existent token', () => {
      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.getPrice('token2')).toBeUndefined();
    });
  });

  describe('connection status', () => {
    it('reflects connected status from PredictController', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: true,
      });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.isConnected).toBe(true);
    });

    it('reflects disconnected status from PredictController', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: false,
      });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.isConnected).toBe(false);
    });

    it('samples connection status once on subscribe and does not poll on an interval', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({ sportsConnected: false, marketConnected: true })
        .mockReturnValueOnce({
          sportsConnected: false,
          marketConnected: false,
        });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // The per-subscriber 1s polling interval was removed (it re-rendered every
      // card once per second for an unused value), so the status stays at the
      // value sampled on subscribe.
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('useLiveMarketPricesSubscription', () => {
    it('subscribes for the given tokens and unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useLiveMarketPricesSubscription(['token1', 'token2']),
      );

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['token1', 'token2'],
        expect.any(Function),
      );

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('does not subscribe when empty or disabled', () => {
      renderHook(() => useLiveMarketPricesSubscription([]));
      renderHook(() =>
        useLiveMarketPricesSubscription(['token1'], { enabled: false }),
      );

      expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
    });
  });

  describe('useLivePrice selector', () => {
    it('returns undefined when no price is cached', () => {
      const { result } = renderHook(() => useLivePrice('token1'));

      expect(result.current).toBeUndefined();
    });

    it('reflects store updates fed by a subscription', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => {
        useLiveMarketPricesSubscription(['token1', 'token2']);
        return useLivePrice('token1');
      });

      expect(result.current).toBeUndefined();

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.6, bestBid: 0.59, bestAsk: 0.61 },
        ]);
      });

      expect(result.current?.bestAsk).toBe(0.61);
    });
  });

  describe('useLivePrices selector', () => {
    it('keeps a stable Map reference when an unrelated token changes', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => {
        useLiveMarketPricesSubscription(['token1', 'other']);
        return useLivePrices(['token1']);
      });

      const initial = result.current;

      act(() => {
        capturedCallback([
          { tokenId: 'other', price: 0.3, bestBid: 0.29, bestAsk: 0.31 },
        ]);
      });

      expect(result.current).toBe(initial);

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.7, bestBid: 0.69, bestAsk: 0.71 },
        ]);
      });

      expect(result.current).not.toBe(initial);
      expect(result.current.get('token1')?.bestAsk).toBe(0.71);
    });
  });

  describe('initial state', () => {
    it('returns empty prices map initially', () => {
      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.prices.size).toBe(0);
    });

    it('returns null lastUpdateTime initially', () => {
      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.lastUpdateTime).toBeNull();
    });

    it('keeps cached prices when disabled so same-token resubscribe does not flicker', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useLiveMarketPrices(['token1'], { enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.prices.size).toBe(1);

      rerender({ enabled: false });

      expect(result.current.prices.size).toBe(1);
      expect(result.current.getPrice('token1')?.price).toBe(0.75);
      expect(result.current.isConnected).toBe(false);
    });

    it('removes prices for tokens that are no longer selected', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const mockNow = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { result, rerender } = renderHook(
        ({ tokenIds }) => useLiveMarketPrices(tokenIds),
        { initialProps: { tokenIds: ['token1'] } },
      );

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.lastUpdateTime).toBe(mockNow);

      rerender({ tokenIds: ['token2'] });

      expect(result.current.prices.size).toBe(0);
      expect(result.current.getPrice('token1')).toBeUndefined();
    });

    it('seeds a new hook instance from the last live update cache', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const first = renderHook(() => useLiveMarketPrices(['token1']));

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      first.unmount();

      const second = renderHook(() => useLiveMarketPrices(['token1']));

      expect(second.result.current.getPrice('token1')).toEqual({
        tokenId: 'token1',
        price: 0.75,
        bestBid: 0.74,
        bestAsk: 0.76,
      });
    });

    it('differentiates tokenIds with commas that could otherwise collide', () => {
      const { rerender } = renderHook(
        ({ tokenIds }) => useLiveMarketPrices(tokenIds),
        { initialProps: { tokenIds: ['a,b', 'c'] } },
      );

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(1);

      rerender({ tokenIds: ['a', 'b,c'] });

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(2);
    });
  });
});
