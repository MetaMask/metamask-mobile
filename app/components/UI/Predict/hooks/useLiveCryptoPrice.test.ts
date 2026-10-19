import { renderHook, act } from '@testing-library/react-native';
import { useLiveCryptoPrice } from './useLiveCryptoPrice';
import Engine from '../../../../core/Engine';
import { CryptoPriceUpdate } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToCryptoPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

describe('useLiveCryptoPrice', () => {
  const mockSubscribeToCryptoPrices = Engine.context.PredictController
    .subscribeToCryptoPrices as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();
  let capturedCallback: (update: CryptoPriceUpdate) => void = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSubscribeToCryptoPrices.mockImplementation((_symbols, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });
    mockGetConnectionStatus.mockReturnValue({
      rtdsConnected: true,
      sportsConnected: false,
      marketConnected: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const sendUpdate = (price: number, timestamp = Date.now()) => {
    act(() => {
      capturedCallback({ symbol: 'btc/usd', price, timestamp });
    });
  };

  it('subscribes to the lowercased ws symbol when enabled', () => {
    renderHook(() => useLiveCryptoPrice({ symbol: 'BTC', enabled: true }));

    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: undefined },
    );
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useLiveCryptoPrice({ symbol: 'BTC', enabled: false }));

    expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
  });

  it('does not subscribe when symbol is undefined', () => {
    renderHook(() => useLiveCryptoPrice({ symbol: undefined }));

    expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
  });

  it('commits the first update immediately', () => {
    const { result } = renderHook(() => useLiveCryptoPrice({ symbol: 'BTC' }));

    expect(result.current.value).toBeUndefined();

    sendUpdate(93000);

    expect(result.current.value).toBe(93000);
  });

  it('coalesces rapid ticks to at most one commit per updateIntervalMs', () => {
    const { result } = renderHook(() =>
      useLiveCryptoPrice({ symbol: 'BTC', updateIntervalMs: 1000 }),
    );

    sendUpdate(93000);
    expect(result.current.value).toBe(93000);

    // Several ticks arrive within the same 1s window — none should commit
    // synchronously since the first tick just committed.
    sendUpdate(93010);
    sendUpdate(93020);
    sendUpdate(93030);
    expect(result.current.value).toBe(93000);

    // The trailing update fires once the interval elapses, applying the
    // latest pending price rather than every intermediate one.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(93030);
  });

  it('commits immediately again once updateIntervalMs has elapsed', () => {
    const { result } = renderHook(() =>
      useLiveCryptoPrice({ symbol: 'BTC', updateIntervalMs: 1000 }),
    );

    sendUpdate(93000);
    expect(result.current.value).toBe(93000);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    sendUpdate(93100);
    expect(result.current.value).toBe(93100);
  });

  it('does not build or expose any point-history array', () => {
    const { result } = renderHook(() => useLiveCryptoPrice({ symbol: 'BTC' }));

    sendUpdate(93000);

    expect(result.current).toEqual({ value: 93000 });
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useLiveCryptoPrice({ symbol: 'BTC' }));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('passes the twap window through to the subscription', () => {
    renderHook(() =>
      useLiveCryptoPrice({ symbol: 'BTC', twapWindowSeconds: 30 }),
    );

    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: 30 },
    );
  });
});
