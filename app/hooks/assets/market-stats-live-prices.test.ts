import { AppState } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import Engine from '../../core/Engine';
import {
  liveHoldingFiat,
  shouldStreamLivePrices,
  useLiveAssetPrices,
  useWatchAssetPrices,
} from './market-stats-live-prices';

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

const PEPE_CHECKSUM =
  'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933';

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

// Unit rather than a view test: the list's Engine mock resolves `call` with
// no socket payload, so a rendered row cannot show that these ids were subscribed.
describe('useWatchAssetPrices', () => {
  it('subscribes each visible asset id once', () => {
    AppState.currentState = 'active';
    const subscribe = Engine.controllerMessenger.call as jest.Mock;
    subscribe.mockClear();

    renderHook(() =>
      useWatchAssetPrices([
        'eip155:1/slip44:60',
        PEPE_CHECKSUM,
        'eip155:1/slip44:60',
      ]),
    );

    expect(subscribe).toHaveBeenCalledWith(
      'MarketStatsService:subscribe',
      [PEPE_CHECKSUM, 'eip155:1/slip44:60'].map((assetId) => ({
        assetId,
        currency: 'usd',
      })),
    );
  });
});

// subscribe returns void. Calling its return value crashes the list on unmount.
describe('useLiveAssetPrices', () => {
  it('unsubscribes with the handler passed to subscribe', () => {
    AppState.currentState = 'active';
    const subscribe = Engine.controllerMessenger.subscribe as jest.Mock;
    const unsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
    subscribe.mockClear();
    unsubscribe.mockClear();

    const { unmount } = renderHook(() => useLiveAssetPrices());

    const pricesHandler = subscribe.mock.calls.find(
      (call) => call[0] === 'MarketStatsService:pricesUpdated',
    )?.[1];
    const chainHandler = subscribe.mock.calls.find(
      (call) => call[0] === 'MarketStatsService:chainStatusChanged',
    )?.[1];

    unmount();

    expect(unsubscribe).toHaveBeenCalledWith(
      'MarketStatsService:pricesUpdated',
      pricesHandler,
    );
    expect(unsubscribe).toHaveBeenCalledWith(
      'MarketStatsService:chainStatusChanged',
      chainHandler,
    );
  });
});
