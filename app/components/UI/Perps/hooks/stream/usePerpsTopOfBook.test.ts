import { act, renderHook } from '@testing-library/react-hooks';
import { usePerpsTopOfBook } from './usePerpsTopOfBook';
import { usePerpsStream } from '../../providers/PerpsStreamManager';

jest.mock('../../providers/PerpsStreamManager');

describe('usePerpsTopOfBook', () => {
  const mockUnsubscribe = jest.fn();
  const mockSubscribeToSymbol = jest.fn(() => mockUnsubscribe);

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsStream as jest.Mock).mockReturnValue({
      topOfBook: {
        subscribeToSymbol: mockSubscribeToSymbol,
      },
    });
  });

  it('subscribes to top of book for provided symbol', () => {
    const symbol = 'BTC';

    renderHook(() => usePerpsTopOfBook({ symbol }));

    expect(mockSubscribeToSymbol).toHaveBeenCalledWith({
      symbol,
      callback: expect.any(Function),
    });
  });

  it('returns undefined initially', () => {
    const { result } = renderHook(() => usePerpsTopOfBook({ symbol: 'BTC' }));

    expect(result.current).toBeUndefined();
  });

  it('does not subscribe when symbol is empty', () => {
    renderHook(() => usePerpsTopOfBook({ symbol: '' }));

    expect(mockSubscribeToSymbol).not.toHaveBeenCalled();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => usePerpsTopOfBook({ symbol: 'BTC' }));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('resubscribes when symbol changes', () => {
    const { rerender } = renderHook(
      ({ symbol }) => usePerpsTopOfBook({ symbol }),
      { initialProps: { symbol: 'BTC' } },
    );

    rerender({ symbol: 'ETH' });

    expect(mockSubscribeToSymbol).toHaveBeenCalledTimes(2);
  });

  it('drops the previous venue quote until the new venue ticks', () => {
    const { result, rerender } = renderHook(
      ({ providerId }: { providerId: 'hyperliquid' | 'lighter' }) =>
        usePerpsTopOfBook({ symbol: 'BTC', providerId }),
      { initialProps: { providerId: 'hyperliquid' } },
    );
    const firstCallback = (
      mockSubscribeToSymbol.mock.calls[0] as unknown as [
        { callback: (data: { bestBid: string; bestAsk: string }) => void },
      ]
    )[0].callback;
    act(() => firstCallback({ bestBid: '100', bestAsk: '101' }));
    expect(result.current).toEqual({ bestBid: '100', bestAsk: '101' });

    rerender({ providerId: 'lighter' });

    expect(result.current).toBeUndefined();
  });
});
