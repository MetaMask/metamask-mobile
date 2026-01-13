import { renderHook, act } from '@testing-library/react-native';
import { useLiveMarketPrices } from './useLiveMarketPrices';
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

    it('updates connection status on interval', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({ sportsConnected: false, marketConnected: true })
        .mockReturnValueOnce({
          sportsConnected: false,
          marketConnected: false,
        });

      const { result } = renderHook(() => useLiveMarketPrices(['token1']));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
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

    it('resets state when disabled', () => {
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

      expect(result.current.prices.size).toBe(0);
      expect(result.current.isConnected).toBe(false);
    });

    it('resets lastUpdateTime when tokenIds change to different valid value', () => {
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

      expect(result.current.lastUpdateTime).toBeNull();
      expect(result.current.prices.size).toBe(0);
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
