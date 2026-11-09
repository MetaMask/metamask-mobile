import { createElement, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import Engine from '../../core/Engine';
import {
  liveHoldingFiat,
  shouldStreamLivePrices,
  useMarketStats,
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
    call: jest.fn(() => Promise.resolve()),
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

  it('keeps the stream on every hardware tier when a network is available', () => {
    expect(shouldStreamLivePrices('LOW', 'SLOW_CELLULAR', true)).toBe(true);
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
  it('subscribes the asset on the details page', async () => {
    AppState.currentState = 'active';
    const call = Engine.controllerMessenger.call as jest.Mock;
    call.mockClear();
    call.mockResolvedValue(undefined);

    renderHook(() =>
      useMarketStatsSubscription([
        'eip155:1/slip44:60',
        'eip155:137/slip44:966',
      ]),
    );

    expect(call).toHaveBeenCalledWith(
      'MarketStatsService:subscribe',
      [
        { assetId: 'eip155:1/slip44:60', currency: 'usd' },
        { assetId: 'eip155:137/slip44:966', currency: 'usd' },
      ],
      'ui',
    );
  });

  it('releases the ui caller when the page closes', async () => {
    AppState.currentState = 'active';
    const call = Engine.controllerMessenger.call as jest.Mock;
    call.mockClear();
    call.mockResolvedValue(undefined);

    const { unmount } = renderHook(() =>
      useMarketStatsSubscription(['eip155:1/slip44:60']),
    );
    unmount();

    expect(call).toHaveBeenLastCalledWith(
      'MarketStatsService:subscribe',
      [],
      'ui',
    );
  });

  it('replaces the ui list when the assets change', async () => {
    AppState.currentState = 'active';
    const call = Engine.controllerMessenger.call as jest.Mock;
    call.mockClear();
    call.mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ assetIds }: { assetIds: readonly string[] }) =>
        useMarketStatsSubscription(assetIds),
      { initialProps: { assetIds: ['eip155:1/slip44:60'] } },
    );
    rerender({ assetIds: ['eip155:137/slip44:966'] });

    expect(
      call.mock.calls.every(
        ([method]) => method === 'MarketStatsService:subscribe',
      ),
    ).toBe(true);
    expect(call).toHaveBeenLastCalledWith(
      'MarketStatsService:subscribe',
      [{ assetId: 'eip155:137/slip44:966', currency: 'usd' }],
      'ui',
    );
  });
});

// subscribe returns void. Calling its return value crashes the list on unmount.
describe('useMarketStats', () => {
  it('unsubscribes with the handler passed to subscribe', () => {
    AppState.currentState = 'active';
    const subscribe = Engine.controllerMessenger.subscribe as jest.Mock;
    const unsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
    subscribe.mockClear();
    unsubscribe.mockClear();

    const { unmount } = renderHook(() => useMarketStats(), {
      wrapper: QueryWrapper,
    });

    const pricesHandler = subscribe.mock.calls.find(
      (call) => call[0] === 'MarketStatsService:pricesUpdated',
    )?.[1];

    unmount();

    expect(unsubscribe).toHaveBeenCalledWith(
      'MarketStatsService:pricesUpdated',
      pricesHandler,
    );
  });
});
