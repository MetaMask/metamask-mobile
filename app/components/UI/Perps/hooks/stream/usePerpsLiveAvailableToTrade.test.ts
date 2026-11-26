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

  it('is unknown until the channel delivers a value', async () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    const initialValue = result.current;

    await act(() => lastSubscription().callback(btcValue));

    expect(initialValue).toBeUndefined();
    expect(result.current).toEqual(btcValue);
  });

  it('returns to unknown when the channel clears the value', async () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    await act(() => lastSubscription().callback(btcValue));

    await act(() => lastSubscription().callback(undefined));

    expect(result.current).toBeUndefined();
  });

  it('returns to unknown when the stream fails', async () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'BTC' }),
    );
    await act(() => lastSubscription().callback(btcValue));

    await act(() => lastSubscription().onError(new Error('closed')));

    expect(result.current).toBeUndefined();
  });

  it('does not subscribe without a market', () => {
    const { result } = renderHook(() => usePerpsLiveAvailableToTrade({}));

    expect(mockSubscribeToMarket).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('clears the previous market value and resubscribes when the market changes', async () => {
    const { result, rerender } = renderHook(
      (props: UsePerpsLiveAvailableToTradeOptions) =>
        usePerpsLiveAvailableToTrade(props),
      { initialProps: { symbol: 'BTC' } },
    );
    await act(() => lastSubscription().callback(btcValue));

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

  it('withholds the explicit venue quote on the first render of the default route', async () => {
    const renderQuote = jest.fn<void, [PerpsAvailableToTrade | undefined]>();
    const initialProps: UsePerpsLiveAvailableToTradeOptions = {
      symbol: 'BTC',
      providerId: 'hyperliquid',
    };
    const { result, rerender } = renderHook(
      (options: UsePerpsLiveAvailableToTradeOptions) => {
        const quote = usePerpsLiveAvailableToTrade(options);
        renderQuote(quote);
        return quote;
      },
      { initialProps },
    );
    await act(() => lastSubscription().callback(btcValue));
    expect(result.current).toEqual(btcValue);
    renderQuote.mockClear();

    rerender({ symbol: 'BTC' });

    expect(renderQuote).toHaveBeenNthCalledWith(1, undefined);
    await act(() => lastSubscription().callback(btcValue));
    expect(result.current).toEqual(btcValue);
  });
});
