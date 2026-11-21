import { act, renderHook } from '@testing-library/react-native';
import {
  readAvailableToTradeUsd,
  usePerpsLiveAvailableToTrade,
} from './usePerpsLiveAvailableToTrade';
import Engine from '../../../../../core/Engine';
import { type SubscribeAvailableToTradeParams } from '@metamask/perps-controller';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      subscribeToAvailableToTrade: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const subscribe = () =>
  Engine.context.PerpsController.subscribeToAvailableToTrade as jest.Mock;

const latestParams = (): SubscribeAvailableToTradeParams =>
  subscribe().mock.calls.at(-1)?.[0] as SubscribeAvailableToTradeParams;

describe('readAvailableToTradeUsd', () => {
  it('reads the venue string for the order side', () => {
    const availableToTrade = {
      providerId: 'hyperliquid' as const,
      symbol: 'BTC',
      long: '800.5',
      short: '120',
    };

    expect(readAvailableToTradeUsd(availableToTrade, 'long')).toBe(800.5);
    expect(readAvailableToTradeUsd(availableToTrade, 'short')).toBe(120);
  });

  it('returns undefined when the venue has not reported a number', () => {
    expect(readAvailableToTradeUsd(null, 'long')).toBeUndefined();
    expect(
      readAvailableToTradeUsd(
        {
          providerId: 'hyperliquid',
          symbol: 'BTC',
          long: 'not-a-number',
          short: '',
        },
        'short',
      ),
    ).toBeUndefined();
  });
});

describe('usePerpsLiveAvailableToTrade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscribe().mockImplementation(() => jest.fn());
  });

  it('keeps the value unknown until the venue callback', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'ETH' }),
    );

    expect(result.current.availableToTrade).toBeNull();
    expect(result.current.isInitialLoading).toBe(true);
    expect(subscribe()).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETH' }),
    );
  });

  it('stores the venue long and short strings without deriving them', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'ETH' }),
    );

    act(() => {
      latestParams().callback({
        providerId: 'hyperliquid',
        symbol: 'ETH',
        long: '800',
        short: '150',
      });
    });

    expect(result.current.availableToTrade).toEqual({
      providerId: 'hyperliquid',
      symbol: 'ETH',
      long: '800',
      short: '150',
    });
    expect(result.current.isInitialLoading).toBe(false);
  });

  it('clears the value when the stream errors', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'ETH' }),
    );
    act(() => {
      latestParams().callback({
        providerId: 'hyperliquid',
        symbol: 'ETH',
        long: '800',
        short: '800',
      });
    });

    act(() => {
      latestParams().onError?.(new Error('stream closed'));
    });

    expect(result.current.availableToTrade).toBeNull();
    expect(result.current.isInitialLoading).toBe(false);
  });

  it('unsubscribes and ignores a late update', () => {
    const unsubscribe = jest.fn();
    subscribe().mockReturnValue(unsubscribe);
    const { unmount } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'ETH' }),
    );
    const params = latestParams();

    unmount();
    act(() => {
      params.callback({
        providerId: 'hyperliquid',
        symbol: 'ETH',
        long: '1',
        short: '1',
      });
    });

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when disabled', () => {
    const { result } = renderHook(() =>
      usePerpsLiveAvailableToTrade({ symbol: 'ETH', enabled: false }),
    );

    expect(subscribe()).not.toHaveBeenCalled();
    expect(result.current.availableToTrade).toBeNull();
    expect(result.current.isInitialLoading).toBe(false);
  });
});
