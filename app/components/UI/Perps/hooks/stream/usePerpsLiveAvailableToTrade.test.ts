import { act, renderHook } from '@testing-library/react-native';
import type { PerpsAvailableToTrade } from '@metamask/perps-controller';
import {
  usePerpsLiveAvailableToTrade,
  type UsePerpsLiveAvailableToTradeOptions,
} from './usePerpsLiveAvailableToTrade';

const mockSubscribeToMarket = jest.fn();
const mockStream = {
  availableToTrade: { subscribeToMarket: mockSubscribeToMarket },
};
jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => mockStream,
}));

const btcValue: PerpsAvailableToTrade = {
  providerId: 'hyperliquid',
  symbol: 'BTC',
  long: '8.65',
  short: '9.65',
};

const lastSubscription = () =>
  mockSubscribeToMarket.mock.calls[
    mockSubscribeToMarket.mock.calls.length - 1
  ][0];

describe('usePerpsLiveAvailableToTrade', () => {
  const unsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToMarket.mockReturnValue(unsubscribe);
  });

  it('subscribes to the shared channel with the market route and order-form throttle', () => {
    renderHook(() =>
      usePerpsLiveAvailableToTrade({
        symbol: 'xyz:TSLA',
        providerId: 'hyperliquid',
      }),
    );

    expect(mockSubscribeToMarket).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'xyz:TSLA',
        providerId: 'hyperliquid',
        throttleMs: 1000,
      }),
    );
  });

  it('is unknown until the channel delivers a value', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    const initialValue = result.current;

    act(() => lastSubscription().callback(btcValue));

    expect(initialValue).toBeUndefined();
    expect(result.current).toEqual(btcValue);
  });

  it('returns to unknown when the channel clears the value', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    act(() => lastSubscription().callback(btcValue));

    act(() => lastSubscription().callback(undefined));

    expect(result.current).toBeUndefined();
  });

  it('returns to unknown when the stream fails', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    act(() => lastSubscription().callback(btcValue));

    act(() => lastSubscription().onError(new Error('closed')));

    expect(result.current).toBeUndefined();
  });

  it('does not subscribe without a market', () => {
    const { result } = renderHook(() => usePerpsLiveAvailableToTrade({}));

    expect(mockSubscribeToMarket).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('clears the previous market value and resubscribes when the market changes', () => {
    const { result, rerender } = renderHook(
      (props: UsePerpsLiveAvailableToTradeOptions) =>
        usePerpsLiveAvailableToTrade(props),
      { initialProps: { symbol: 'BTC' } },
    );
    act(() => lastSubscription().callback(btcValue));

    rerender({ symbol: 'ETH' });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(lastSubscription().symbol).toBe('ETH');
    expect(result.current).toBeUndefined();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
