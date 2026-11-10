import { act, renderHook } from '@testing-library/react-native';
import type {
  PerpsAvailableToTrade,
  SubscribeAvailableToTradeParams,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import {
  usePerpsAvailableToTrade,
  type UsePerpsAvailableToTradeParams,
} from './usePerpsAvailableToTrade';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToAvailableToTrade: jest.fn(),
    },
  },
}));

const mockSubscribe = Engine.context.PerpsController
  .subscribeToAvailableToTrade as jest.MockedFunction<
  typeof Engine.context.PerpsController.subscribeToAvailableToTrade
>;

const btcValue: PerpsAvailableToTrade = {
  providerId: 'hyperliquid',
  symbol: 'BTC',
  long: '8.65',
  short: '9.65',
};

const lastSubscription = (): SubscribeAvailableToTradeParams => {
  const { calls } = mockSubscribe.mock;
  return calls[calls.length - 1][0];
};

describe('usePerpsAvailableToTrade', () => {
  const unsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(unsubscribe);
  });

  it('is unknown until the controller reports the market value', () => {
    const { result } = renderHook(() =>
      usePerpsAvailableToTrade({ symbol: 'BTC', enabled: true }),
    );

    expect(result.current).toBeUndefined();

    act(() => lastSubscription().callback(btcValue));

    expect(result.current).toEqual(btcValue);
  });

  it('routes the subscription to the market provider', () => {
    renderHook(() =>
      usePerpsAvailableToTrade({
        symbol: 'xyz:TSLA',
        providerId: 'hyperliquid',
        enabled: true,
      }),
    );

    expect(lastSubscription()).toEqual(
      expect.objectContaining({
        symbol: 'xyz:TSLA',
        providerId: 'hyperliquid',
      }),
    );
  });

  it('does not subscribe before Perps is connected', () => {
    const { result } = renderHook(() =>
      usePerpsAvailableToTrade({ symbol: 'BTC', enabled: false }),
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('ignores a value reported for another market', () => {
    const { result } = renderHook(() =>
      usePerpsAvailableToTrade({ symbol: 'BTC', enabled: true }),
    );

    act(() => lastSubscription().callback({ ...btcValue, symbol: 'ETH' }));

    expect(result.current).toBeUndefined();
  });

  it('returns to unknown when the stream fails', () => {
    const { result } = renderHook(() =>
      usePerpsAvailableToTrade({ symbol: 'BTC', enabled: true }),
    );
    act(() => lastSubscription().callback(btcValue));

    act(() => lastSubscription().onError?.(new Error('closed')));

    expect(result.current).toBeUndefined();
  });

  it('restarts the stream and clears the old value when the account changes', () => {
    const { result, rerender } = renderHook(
      (props: UsePerpsAvailableToTradeParams) =>
        usePerpsAvailableToTrade(props),
      {
        initialProps: {
          symbol: 'BTC',
          enabled: true,
          accountAddress: '0x1',
        } as UsePerpsAvailableToTradeParams,
      },
    );
    act(() => lastSubscription().callback(btcValue));

    rerender({ symbol: 'BTC', enabled: true, accountAddress: '0x2' });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(result.current).toBeUndefined();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      usePerpsAvailableToTrade({ symbol: 'BTC', enabled: true }),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
