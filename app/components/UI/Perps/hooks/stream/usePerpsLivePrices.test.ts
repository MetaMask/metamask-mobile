import { renderHook, act } from '@testing-library/react-hooks';
import { usePerpsLivePrices } from './usePerpsLivePrices';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { type PriceUpdate } from '@metamask/perps-controller';

jest.mock('../../providers/PerpsStreamManager');

describe('usePerpsLivePrices', () => {
  const mockUnsubscribe = jest.fn();
  const mockSubscribeToSymbols = jest.fn(() => mockUnsubscribe);
  const mockStream = { prices: { subscribeToSymbols: mockSubscribeToSymbols } };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsStream as jest.Mock).mockReturnValue(mockStream);
    mockSubscribeToSymbols.mockReturnValue(mockUnsubscribe);
  });

  it('returns empty prices initially', () => {
    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC'] }),
    );
    expect(result.current).toEqual({});
  });

  it('subscribes to symbols on mount', () => {
    renderHook(() => usePerpsLivePrices({ symbols: ['ETH', 'BTC'] }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({
        symbols: ['ETH', 'BTC'],
        callback: expect.any(Function),
      }),
    );
  });

  it('passes includeMarketData:false by default', () => {
    renderHook(() => usePerpsLivePrices({ symbols: ['BTC'] }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ includeMarketData: false }),
    );
  });

  it('passes includeMarketData:true when opted in', () => {
    renderHook(() =>
      usePerpsLivePrices({ symbols: ['BTC'], includeMarketData: true }),
    );

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ includeMarketData: true }),
    );
  });

  it('delivers price updates via the callback', () => {
    const { result } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['SOL'] }),
    );

    const callback = mockSubscribeToSymbols.mock.calls[0][0].callback;
    const update: Record<string, PriceUpdate> = {
      SOL: {
        symbol: 'SOL',
        price: '150.00',
        timestamp: Date.now(),
        markPrice: '150.50',
        funding: 0.0001,
        openInterest: 500000,
        volume24h: 1000000,
      },
    };

    act(() => {
      callback(update);
    });

    expect(result.current.SOL?.price).toBe('150.00');
    expect(result.current.SOL?.markPrice).toBe('150.50');
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsLivePrices({ symbols: ['ETH'] }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes when includeMarketData changes', () => {
    const { rerender } = renderHook(
      ({ fast }: { fast: boolean }) =>
        usePerpsLivePrices({ symbols: ['BTC'], includeMarketData: fast }),
      { initialProps: { fast: false } },
    );

    expect(mockSubscribeToSymbols).toHaveBeenCalledTimes(1);
    expect(mockSubscribeToSymbols.mock.calls[0][0].includeMarketData).toBe(
      false,
    );

    rerender({ fast: true });

    expect(mockSubscribeToSymbols).toHaveBeenCalledTimes(2);
    expect(mockSubscribeToSymbols.mock.calls[1][0].includeMarketData).toBe(
      true,
    );
    // Old sub should be torn down
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when symbols array is empty', () => {
    renderHook(() => usePerpsLivePrices({ symbols: [] }));
    expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
  });

  it('passes throttleMs through', () => {
    renderHook(() => usePerpsLivePrices({ symbols: ['BTC'], throttleMs: 500 }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ throttleMs: 500 }),
    );
  });
});
