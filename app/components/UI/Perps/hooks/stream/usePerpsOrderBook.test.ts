import { renderHook } from '@testing-library/react-hooks';
import { usePerpsOrderBook } from './usePerpsOrderBook';
import { usePerpsStream } from '../../providers/PerpsStreamManager';

jest.mock('../../providers/PerpsStreamManager');

describe('usePerpsOrderBook', () => {
  const mockUnsubscribe = jest.fn();
  const mockSubscribeToSymbols = jest.fn(() => mockUnsubscribe);

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsStream as jest.Mock).mockReturnValue({
      orderBooks: {
        subscribeToSymbols: mockSubscribeToSymbols,
      },
    });
  });

  it('subscribes to order books for provided symbols', () => {
    const symbols = ['BTC', 'ETH'];

    renderHook(() => usePerpsOrderBook({ symbols }));

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith({
      symbols,
      callback: expect.any(Function),
    });
  });

  it('returns empty object initially', () => {
    const { result } = renderHook(() =>
      usePerpsOrderBook({ symbols: ['BTC'] }),
    );

    expect(result.current).toEqual({});
  });

  it('does not subscribe when symbols array is empty', () => {
    renderHook(() => usePerpsOrderBook({ symbols: [] }));

    expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsOrderBook({ symbols: ['BTC'] }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('resubscribes when symbols change', () => {
    const { rerender } = renderHook(
      ({ symbols }) => usePerpsOrderBook({ symbols }),
      { initialProps: { symbols: ['BTC'] } },
    );

    rerender({ symbols: ['ETH'] });

    expect(mockSubscribeToSymbols).toHaveBeenCalledTimes(2);
  });
});
