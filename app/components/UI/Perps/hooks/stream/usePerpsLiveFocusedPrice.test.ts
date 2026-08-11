import { renderHook, act } from '@testing-library/react-native';
import { usePerpsLiveFocusedPrice } from './usePerpsLiveFocusedPrice';
import { type PriceUpdate } from '@metamask/perps-controller';

// Mock the entire PerpsStreamManager provider so we control stream.focusedPrice
const mockSubscribeToSymbol = jest.fn();
jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    focusedPrice: {
      subscribeToSymbol: mockSubscribeToSymbol,
    },
  }),
}));

describe('usePerpsLiveFocusedPrice', () => {
  const mockPriceUpdate: PriceUpdate = {
    symbol: 'BTC',
    price: '50000',
    markPrice: '50050',
    percentChange24h: '2.5',
    timestamp: 123,
    isTradable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToSymbol.mockReturnValue(jest.fn());
  });

  describe('subscription lifecycle', () => {
    it('subscribes to the focused price channel on mount', () => {
      renderHook(() => usePerpsLiveFocusedPrice({ symbol: 'BTC' }));

      expect(mockSubscribeToSymbol).toHaveBeenCalledWith({
        symbol: 'BTC',
        callback: expect.any(Function),
      });
    });

    it('passes the symbol from options to the channel', () => {
      renderHook(() => usePerpsLiveFocusedPrice({ symbol: 'ETH' }));

      expect(mockSubscribeToSymbol).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'ETH' }),
      );
    });

    it('calls the returned unsubscribe function on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToSymbol.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC' }),
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('resubscribes when the symbol changes', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToSymbol.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ symbol }) => usePerpsLiveFocusedPrice({ symbol }),
        { initialProps: { symbol: 'BTC' } },
      );

      expect(mockSubscribeToSymbol).toHaveBeenCalledTimes(1);

      rerender({ symbol: 'ETH' });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToSymbol).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToSymbol).toHaveBeenLastCalledWith(
        expect.objectContaining({ symbol: 'ETH' }),
      );
    });
  });

  describe('enabled flag', () => {
    it('does not subscribe when enabled is false', () => {
      renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC', enabled: false }),
      );

      expect(mockSubscribeToSymbol).not.toHaveBeenCalled();
    });

    it('returns undefined when disabled', () => {
      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC', enabled: false }),
      );

      expect(result.current).toBeUndefined();
    });

    it('subscribes when enabled is true (default)', () => {
      renderHook(() => usePerpsLiveFocusedPrice({ symbol: 'BTC' }));

      expect(mockSubscribeToSymbol).toHaveBeenCalledTimes(1);
    });

    it('resubscribes when enabled changes from false to true', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToSymbol.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ enabled }) => usePerpsLiveFocusedPrice({ symbol: 'BTC', enabled }),
        { initialProps: { enabled: false } },
      );

      expect(mockSubscribeToSymbol).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockSubscribeToSymbol).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes when enabled changes from true to false', () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToSymbol.mockReturnValue(mockUnsubscribe);

      const { rerender } = renderHook(
        ({ enabled }) => usePerpsLiveFocusedPrice({ symbol: 'BTC', enabled }),
        { initialProps: { enabled: true } },
      );

      rerender({ enabled: false });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty symbol handling', () => {
    it('does not subscribe when symbol is empty', () => {
      renderHook(() => usePerpsLiveFocusedPrice({ symbol: '' }));

      expect(mockSubscribeToSymbol).not.toHaveBeenCalled();
    });

    it('returns undefined when symbol is empty', () => {
      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: '' }),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('price update delivery', () => {
    it('returns undefined before the first tick', () => {
      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC' }),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns the price update when the channel fires', () => {
      let capturedCallback: (update: PriceUpdate | undefined) => void =
        jest.fn();

      mockSubscribeToSymbol.mockImplementation(
        (params: { callback: (update: PriceUpdate | undefined) => void }) => {
          capturedCallback = params.callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC' }),
      );

      act(() => {
        capturedCallback(mockPriceUpdate);
      });

      expect(result.current).toEqual(mockPriceUpdate);
    });

    it('updates when a subsequent tick fires with new data', () => {
      let capturedCallback: (update: PriceUpdate | undefined) => void =
        jest.fn();

      mockSubscribeToSymbol.mockImplementation(
        (params: { callback: (update: PriceUpdate | undefined) => void }) => {
          capturedCallback = params.callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC' }),
      );

      act(() => {
        capturedCallback(mockPriceUpdate);
      });

      expect(result.current?.price).toBe('50000');

      const updatedPrice: PriceUpdate = { ...mockPriceUpdate, price: '51000' };

      act(() => {
        capturedCallback(updatedPrice);
      });

      expect(result.current?.price).toBe('51000');
    });

    it('returns undefined when the channel fires with undefined', () => {
      let capturedCallback: (update: PriceUpdate | undefined) => void =
        jest.fn();

      mockSubscribeToSymbol.mockImplementation(
        (params: { callback: (update: PriceUpdate | undefined) => void }) => {
          capturedCallback = params.callback;
          return jest.fn();
        },
      );

      const { result } = renderHook(() =>
        usePerpsLiveFocusedPrice({ symbol: 'BTC' }),
      );

      act(() => {
        capturedCallback(mockPriceUpdate);
      });

      act(() => {
        capturedCallback(undefined);
      });

      expect(result.current).toBeUndefined();
    });
  });

  describe('symbol change resets state', () => {
    it('clears stale price data when the symbol changes', () => {
      let capturedCallback: (update: PriceUpdate | undefined) => void =
        jest.fn();

      mockSubscribeToSymbol.mockImplementation(
        (params: { callback: (update: PriceUpdate | undefined) => void }) => {
          capturedCallback = params.callback;
          return jest.fn();
        },
      );

      const { result, rerender } = renderHook(
        ({ symbol }) => usePerpsLiveFocusedPrice({ symbol }),
        { initialProps: { symbol: 'BTC' } },
      );

      act(() => {
        capturedCallback(mockPriceUpdate);
      });

      expect(result.current?.symbol).toBe('BTC');

      rerender({ symbol: 'ETH' });

      // After symbol change, the hook re-subscribes but no new tick has fired
      expect(result.current).toBeUndefined();
    });
  });
});
