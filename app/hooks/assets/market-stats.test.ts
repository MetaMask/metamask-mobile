import { createElement, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { marketStatsQueryKey, quotesFor } from '@metamask/core-backend';
import Engine from '../../core/Engine';
import {
  liveHoldingFiat,
  shouldStreamLivePrices,
  useMarketStats,
  useMarketStatsListener,
  useMarketStatsSubscription,
} from './market-stats';

jest.mock('react-redux', () => ({
  useSelector: () => 'usd',
}));
jest.mock('../useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    call: jest.fn().mockResolvedValue(undefined),
  },
}));

function QueryWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
  );
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('shouldStreamLivePrices', () => {
  it('stays on the polled price when the network is none or the app is backgrounded', () => {
    expect(shouldStreamLivePrices('HIGH', 'NONE', true)).toBe(false);
    expect(shouldStreamLivePrices('LOW', 'WIFI', false)).toBe(false);
  });

  it('stays on the polled price for LOW hardware on a slow cellular connection', () => {
    expect(shouldStreamLivePrices('LOW', 'SLOW_CELLULAR', true)).toBe(false);
  });

  it('keeps the stream on other hardware tiers on a slow cellular connection', () => {
    expect(shouldStreamLivePrices('MID', 'SLOW_CELLULAR', true)).toBe(true);
    expect(shouldStreamLivePrices('HIGH', 'SLOW_CELLULAR', true)).toBe(true);
    expect(shouldStreamLivePrices(null, 'SLOW_CELLULAR', true)).toBe(true);
  });

  it('keeps the stream on every hardware tier when a fast network is available', () => {
    expect(shouldStreamLivePrices('LOW', 'WIFI', true)).toBe(true);
    expect(shouldStreamLivePrices('LOW', 'FAST_CELLULAR', true)).toBe(true);
    expect(shouldStreamLivePrices(null, null, true)).toBe(true);
    expect(shouldStreamLivePrices('HIGH', 'WIFI', true)).toBe(true);
  });
});

describe('liveHoldingFiat', () => {
  it('multiplies the token amount by the streamed unit price', () => {
    expect(liveHoldingFiat(0.00181, 2014.93)).toBeCloseTo(3.6470233);
  });

  it('returns undefined when the amount or the price is missing', () => {
    expect(liveHoldingFiat(undefined, 10)).toBeUndefined();
    expect(liveHoldingFiat(1, undefined)).toBeUndefined();
    expect(liveHoldingFiat(Number.NaN, 10)).toBeUndefined();
  });
});

describe('useMarketStatsSubscription', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AppState.currentState = 'active';
    (Engine.controllerMessenger.call as jest.Mock).mockClear();
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes the asset on the details page after the debounce', () => {
    const call = Engine.controllerMessenger.call as jest.Mock;

    renderHook(() =>
      useMarketStatsSubscription([
        'eip155:1/slip44:60',
        'eip155:137/slip44:966',
      ]),
    );

    expect(call).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(call).toHaveBeenCalledWith(
      'MarketStatsService:subscribe',
      [
        { assetId: 'eip155:1/slip44:60', currency: 'usd' },
        { assetId: 'eip155:137/slip44:966', currency: 'usd' },
      ],
      'ui',
    );
  });

  it('does not subscribe when the page closes before the debounce', () => {
    const call = Engine.controllerMessenger.call as jest.Mock;

    const { unmount } = renderHook(() =>
      useMarketStatsSubscription(['eip155:1/slip44:60']),
    );
    unmount();
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(call).not.toHaveBeenCalled();
  });

  it('releases the ui caller when the page closes after the subscribe', () => {
    const call = Engine.controllerMessenger.call as jest.Mock;

    const { unmount } = renderHook(() =>
      useMarketStatsSubscription(['eip155:1/slip44:60']),
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    unmount();

    expect(call).toHaveBeenLastCalledWith(
      'MarketStatsService:subscribe',
      [],
      'ui',
    );
  });

  it('replaces the ui list when the assets change', () => {
    const call = Engine.controllerMessenger.call as jest.Mock;

    const { rerender } = renderHook(
      ({ assetIds }: { assetIds: readonly string[] }) =>
        useMarketStatsSubscription(assetIds),
      { initialProps: { assetIds: ['eip155:1/slip44:60'] } },
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    rerender({ assetIds: ['eip155:137/slip44:966'] });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(call).toHaveBeenLastCalledWith(
      'MarketStatsService:subscribe',
      [{ assetId: 'eip155:137/slip44:966', currency: 'usd' }],
      'ui',
    );
  });
});

// subscribe returns void. Calling its return value crashes the list on unmount.
describe('useMarketStatsListener', () => {
  it('unsubscribes with the handler passed to subscribe', async () => {
    AppState.currentState = 'active';
    const subscribe = Engine.controllerMessenger.subscribe as jest.Mock;
    const unsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
    subscribe.mockClear();
    unsubscribe.mockClear();

    const { unmount } = renderHook(() => useMarketStatsListener(), {
      wrapper: QueryWrapper,
    });

    const pricesHandler = subscribe.mock.calls.find(
      (call) => call[0] === 'MarketStatsService:pricesUpdated',
    )?.[1];

    unmount();

    // subscribeLiveQuotes attaches the unsubscribe on a microtask.
    await waitFor(() => {
      expect(unsubscribe).toHaveBeenCalledWith(
        'MarketStatsService:pricesUpdated',
        pricesHandler,
      );
    });
  });

  it('drops the cached quotes when streaming stops', () => {
    AppState.currentState = 'background';
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      marketStatsQueryKey('usd'),
      new Map([['eip155:1/slip44:60', { price: 10 }]]),
    );

    renderHook(() => useMarketStatsListener(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    });

    expect(quotesFor(queryClient, 'usd').size).toBe(0);
  });
});

describe('useMarketStats', () => {
  it('adds no listener of its own', () => {
    AppState.currentState = 'active';
    const subscribe = Engine.controllerMessenger.subscribe as jest.Mock;
    subscribe.mockClear();

    renderHook(() => useMarketStats(), { wrapper: QueryWrapper });
    renderHook(() => useMarketStats(), { wrapper: QueryWrapper });

    expect(subscribe).not.toHaveBeenCalled();
  });
});
