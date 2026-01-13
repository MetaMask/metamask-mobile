import { renderHook, act } from '@testing-library/react-native';
import { useLiveTokenPrice } from './useLiveTokenPrice';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';
import { PriceUpdate } from '../types';

jest.mock('../providers/polymarket/WebSocketManager');

describe('useLiveTokenPrice', () => {
  const mockSubscribeToMarketPrices = jest.fn();
  const mockGetConnectionStatus = jest.fn();
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (WebSocketManager.getInstance as jest.Mock).mockReturnValue({
      subscribeToMarketPrices: mockSubscribeToMarketPrices,
      getConnectionStatus: mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: true,
        gameSubscriptionCount: 0,
        priceSubscriptionCount: 1,
      }),
    });
    mockSubscribeToMarketPrices.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscription management', () => {
    it('subscribes to single token when tokenId is provided', () => {
      renderHook(() => useLiveTokenPrice('token1'));

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['token1'],
        expect.any(Function),
      );
    });

    it('does not subscribe when tokenId is null', () => {
      renderHook(() => useLiveTokenPrice(null));

      expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
    });

    it('does not subscribe when enabled is false', () => {
      renderHook(() => useLiveTokenPrice('token1', { enabled: false }));

      expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useLiveTokenPrice('token1'));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when tokenId changes', () => {
      const { rerender } = renderHook(
        ({ tokenId }) => useLiveTokenPrice(tokenId),
        { initialProps: { tokenId: 'token1' as string | null } },
      );

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['token1'],
        expect.any(Function),
      );

      rerender({ tokenId: 'token2' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToMarketPrices).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToMarketPrices).toHaveBeenLastCalledWith(
        ['token2'],
        expect.any(Function),
      );
    });
  });

  describe('price update handling', () => {
    it('updates price when relevant update is received', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      expect(result.current.price).toBeNull();

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.price).toEqual({
        tokenId: 'token1',
        price: 0.75,
        bestBid: 0.74,
        bestAsk: 0.76,
      });
    });

    it('ignores updates for other tokens', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      act(() => {
        capturedCallback([
          { tokenId: 'token2', price: 0.25, bestBid: 0.24, bestAsk: 0.26 },
        ]);
      });

      expect(result.current.price).toBeNull();
    });

    it('extracts correct token from batch updates', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      act(() => {
        capturedCallback([
          { tokenId: 'token2', price: 0.25, bestBid: 0.24, bestAsk: 0.26 },
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
          { tokenId: 'token3', price: 0.5, bestBid: 0.49, bestAsk: 0.51 },
        ]);
      });

      expect(result.current.price?.tokenId).toBe('token1');
      expect(result.current.price?.price).toBe(0.75);
    });

    it('updates price when new update for same token arrives', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.price?.price).toBe(0.75);

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.8, bestBid: 0.79, bestAsk: 0.81 },
        ]);
      });

      expect(result.current.price?.price).toBe(0.8);
    });
  });

  describe('connection status', () => {
    it('reflects connected status from WebSocketManager', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: true,
        gameSubscriptionCount: 0,
        priceSubscriptionCount: 1,
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      expect(result.current.isConnected).toBe(true);
    });

    it('reflects disconnected status from WebSocketManager', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: false,
        gameSubscriptionCount: 0,
        priceSubscriptionCount: 0,
      });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      expect(result.current.isConnected).toBe(false);
    });

    it('updates connection status on interval', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({ marketConnected: true })
        .mockReturnValueOnce({ marketConnected: false });

      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('initial state', () => {
    it('returns null price initially', () => {
      const { result } = renderHook(() => useLiveTokenPrice('token1'));

      expect(result.current.price).toBeNull();
    });

    it('resets state when disabled', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useLiveTokenPrice('token1', { enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.price).not.toBeNull();

      rerender({ enabled: false });

      expect(result.current.price).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it('resets state when tokenId becomes null', () => {
      let capturedCallback: (updates: PriceUpdate[]) => void = jest.fn();
      mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ tokenId }) => useLiveTokenPrice(tokenId),
        { initialProps: { tokenId: 'token1' as string | null } },
      );

      act(() => {
        capturedCallback([
          { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        ]);
      });

      expect(result.current.price).not.toBeNull();

      rerender({ tokenId: null });

      expect(result.current.price).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('granular subscription pattern', () => {
    it('subscribes with single-element array for one token', () => {
      renderHook(() => useLiveTokenPrice('token1'));

      expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
        ['token1'],
        expect.any(Function),
      );
      expect(mockSubscribeToMarketPrices.mock.calls[0][0]).toHaveLength(1);
    });
  });
});
