import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { AppState, type View } from 'react-native';
import type { NetworkTier } from '../../../../hooks/useNetworkTier';
import SocialLivePricesProvider, {
  SLOW_NETWORK_THROTTLE_MS,
} from './SocialLivePricesProvider';
import {
  useSocialLivePrices,
  type SocialLivePricesContextValue,
} from './SocialLivePricesContext';
import type { SocialLivePriceKey } from './types';

const mockCall = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

const mockPerpUnsubscribe = jest.fn();
const mockSubscribeToSymbols = jest.fn();
jest.mock('../../Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsStream: () => ({
    prices: { subscribeToSymbols: mockSubscribeToSymbols },
  }),
}));

let mockIsFocused = true;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockIsFocused,
}));

let mockNetworkTier: NetworkTier | null = null;
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

const mockGetHardwareTier = jest.fn();
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => true,
}));

const ETH_ASSET = 'eip155:1/slip44:60';
const DEFAULT_POLL_MS = 4000;
const RARE_POLL_MS = 8000;
const INITIAL_SETTLE_MS = 1000;
/** Fake timers run a 0 ms timeout scheduled mid-tick one millisecond later. */
const ZERO_DELAY_LAG_MS = 1;
const ETH_CHANNEL = `market-data.v1.${ETH_ASSET}.1m.usd`;

interface ProbeCard {
  id: string;
  key: SocialLivePriceKey;
  y: number;
}

const mockMeasureInWindow = jest.fn();
const fakeRef = (y: number) => ({
  current: {
    measureInWindow: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => {
      mockMeasureInWindow();
      callback(0, y, 360, 100);
    },
  } as unknown as View,
});

let context: SocialLivePricesContextValue | null = null;

const captureContext = (value: SocialLivePricesContextValue | null) => {
  context = value;
};

const Probe = ({ cards }: { cards: ProbeCard[] }) => {
  const livePrices = useSocialLivePrices();
  useEffect(() => {
    captureContext(livePrices);
    const unregisters = cards.map(({ id, key, y }) =>
      livePrices?.register(id, key, fakeRef(y)),
    );
    return () => unregisters.forEach((unregister) => unregister?.());
  }, [cards, livePrices]);
  return null;
};

const renderProvider = (cards: ProbeCard[]) =>
  render(
    <SocialLivePricesProvider>
      <Probe cards={cards} />
    </SocialLivePricesProvider>,
  );

// Measuring is async, so the subscribe debounce starts after the visibility one.
const settle = async () => {
  for (let step = 0; step < 3; step++) {
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
  }
};

const spotSubscribeCalls = () =>
  mockCall.mock.calls.filter(([action]) => action === 'OHLCVService:subscribe');

const barListener = () =>
  mockSubscribe.mock.calls.find(
    ([event]) => event === 'OHLCVService:barUpdated',
  )?.[1] as (payload: { channel: string; bar: { close: number } }) => void;

describe('SocialLivePricesProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCall.mockResolvedValue(undefined);
    mockSubscribeToSymbols.mockReturnValue(mockPerpUnsubscribe);
    mockGetHardwareTier.mockReturnValue('HIGH');
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });
    mockIsFocused = true;
    mockNetworkTier = null;
    context = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('subscribes the candle channel of a visible spot card', async () => {
    renderProvider([{ id: 'a', key: `spot:${ETH_ASSET}`, y: 100 }]);

    await settle();

    expect(mockCall).toHaveBeenCalledWith('OHLCVService:subscribe', {
      assetId: ETH_ASSET,
      interval: '1m',
      currency: 'usd',
    });
  });

  it('orders an unsubscribe after an in-flight subscribe', async () => {
    let resolveSubscribe: (() => void) | undefined;
    const subscribePromise = new Promise<void>((resolve) => {
      resolveSubscribe = resolve;
    });
    mockCall.mockImplementation((...args: unknown[]) =>
      args[0] === 'OHLCVService:subscribe'
        ? subscribePromise
        : Promise.resolve(),
    );

    const { unmount } = renderProvider([
      { id: 'a', key: `spot:${ETH_ASSET}`, y: 100 },
    ]);
    await settle();

    unmount();

    expect(
      mockCall.mock.calls.filter(
        ([action]) => action === 'OHLCVService:unsubscribe',
      ),
    ).toHaveLength(0);

    await act(async () => {
      resolveSubscribe?.();
      await subscribePromise;
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenLastCalledWith('OHLCVService:unsubscribe', {
      assetId: ETH_ASSET,
      interval: '1m',
      currency: 'usd',
    });
  });

  it('publishes the candle close to the card key', async () => {
    renderProvider([{ id: 'a', key: `spot:${ETH_ASSET}`, y: 100 }]);
    await settle();

    act(() => {
      barListener()({ channel: ETH_CHANNEL, bar: { close: 4000 } });
    });

    expect(context?.store.get(`spot:${ETH_ASSET}`)?.price).toBe(4000);
  });

  it('ignores bars of channels it did not open', async () => {
    renderProvider([{ id: 'a', key: `spot:${ETH_ASSET}`, y: 100 }]);
    await settle();

    act(() => {
      barListener()({
        channel: 'market-data.v1.eip155:1/erc20:0xabc.1m.usd',
        bar: { close: 1 },
      });
    });

    expect(context?.store.get('spot:eip155:1/erc20:0xabc')).toBeUndefined();
  });

  it('skips cards far outside the window', async () => {
    renderProvider([{ id: 'a', key: `spot:${ETH_ASSET}`, y: 50_000 }]);

    await settle();

    expect(spotSubscribeCalls()).toHaveLength(0);
  });

  it('subscribes one channel for an asset shown on several cards', async () => {
    renderProvider([
      { id: 'a', key: `spot:${ETH_ASSET}`, y: 100 },
      { id: 'b', key: `spot:${ETH_ASSET}`, y: 300 },
    ]);

    await settle();

    expect(spotSubscribeCalls()).toHaveLength(1);
  });

  it('caps spot channels at 20', async () => {
    const cards = Array.from({ length: 25 }, (_, index) => ({
      id: `card-${index}`,
      key: `spot:eip155:1/erc20:0x${index.toString(16).padStart(40, '0')}` as SocialLivePriceKey,
      y: index * 10,
    }));
    renderProvider(cards);

    await settle();

    expect(spotSubscribeCalls()).toHaveLength(20);
  });

  it('streams visible perps and publishes the mark price', async () => {
    renderProvider([{ id: 'a', key: 'perp:BTC', y: 100 }]);
    await settle();

    expect(mockSubscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ symbols: ['BTC'] }),
    );
    const { callback } = mockSubscribeToSymbols.mock.calls[0][0];
    act(() => {
      callback({ BTC: { price: '100000', markPrice: '100010' } });
    });

    expect(context?.store.get('perp:BTC')?.price).toBe(100010);
  });

  it('drops every subscription when the screen blurs', async () => {
    const cards: ProbeCard[] = [
      { id: 'a', key: `spot:${ETH_ASSET}`, y: 100 },
      { id: 'b', key: 'perp:BTC', y: 300 },
    ];
    const { rerender } = renderProvider(cards);
    await settle();

    mockIsFocused = false;
    rerender(
      <SocialLivePricesProvider>
        <Probe cards={cards} />
      </SocialLivePricesProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'OHLCVService:unsubscribe',
      expect.objectContaining({ assetId: ETH_ASSET }),
    );
    expect(mockPerpUnsubscribe).toHaveBeenCalled();
  });

  it('stays idle while offline', async () => {
    mockNetworkTier = 'NONE';
    renderProvider([{ id: 'a', key: `spot:${ETH_ASSET}`, y: 100 }]);

    await settle();

    expect(spotSubscribeCalls()).toHaveLength(0);
  });

  it('slows the tick rate on a slow cellular network', async () => {
    mockNetworkTier = 'SLOW_CELLULAR';
    renderProvider([{ id: 'a', key: 'perp:BTC', y: 100 }]);
    await settle();
    const { callback } = mockSubscribeToSymbols.mock.calls[0][0];

    act(() => {
      callback({ BTC: { price: '100' } });
      callback({ BTC: { price: '101' } });
    });
    expect(context?.store.get('perp:BTC')?.price).toBe(100);

    await act(async () => {
      jest.advanceTimersByTime(SLOW_NETWORK_THROTTLE_MS);
    });

    expect(context?.store.get('perp:BTC')?.price).toBe(101);
  });

  it('reduces motion on LOW hardware only', () => {
    mockNetworkTier = 'WIFI';
    mockGetHardwareTier.mockReturnValue(null);
    const { unmount } = renderProvider([]);
    expect(context?.reduceMotion).toBe(false);
    unmount();

    mockGetHardwareTier.mockReturnValue('LOW');
    renderProvider([]);

    expect(context?.reduceMotion).toBe(true);
  });

  it('keeps motion on LOW hardware while the network tier is unknown', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockNetworkTier = null;

    renderProvider([]);

    expect(context?.reduceMotion).toBe(false);
  });

  it('keeps a null hardware tier off reduced motion over slow cellular', () => {
    mockGetHardwareTier.mockReturnValue(null);
    mockNetworkTier = 'SLOW_CELLULAR';

    renderProvider([]);

    expect(context?.reduceMotion).toBe(false);
  });

  it('keeps full motion on HIGH hardware over slow cellular', () => {
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockNetworkTier = 'SLOW_CELLULAR';

    renderProvider([]);

    expect(context?.reduceMotion).toBe(false);
  });

  it('polls visible cards at the rare interval on LOW hardware over slow cellular', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockNetworkTier = 'SLOW_CELLULAR';
    renderProvider([{ id: 'a', key: 'perp:BTC', y: 100 }]);
    act(() => {
      jest.advanceTimersByTime(INITIAL_SETTLE_MS);
    });
    mockMeasureInWindow.mockClear();

    act(() => {
      jest.advanceTimersByTime(RARE_POLL_MS - INITIAL_SETTLE_MS - 1);
    });
    expect(mockMeasureInWindow).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1 + ZERO_DELAY_LAG_MS);
    });
    expect(mockMeasureInWindow).toHaveBeenCalledTimes(1);
  });

  it('keeps the default poll on HIGH hardware over slow cellular', () => {
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockNetworkTier = 'SLOW_CELLULAR';
    renderProvider([{ id: 'a', key: 'perp:BTC', y: 100 }]);
    act(() => {
      jest.advanceTimersByTime(INITIAL_SETTLE_MS);
    });
    mockMeasureInWindow.mockClear();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_POLL_MS - INITIAL_SETTLE_MS - 1);
    });
    expect(mockMeasureInWindow).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1 + ZERO_DELAY_LAG_MS);
    });
    expect(mockMeasureInWindow).toHaveBeenCalledTimes(1);
  });

  it('keeps the default poll on LOW hardware while the network tier is unknown', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockNetworkTier = null;
    renderProvider([{ id: 'a', key: 'perp:BTC', y: 100 }]);
    act(() => {
      jest.advanceTimersByTime(INITIAL_SETTLE_MS);
    });
    mockMeasureInWindow.mockClear();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_POLL_MS - INITIAL_SETTLE_MS - 1);
    });
    expect(mockMeasureInWindow).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1 + ZERO_DELAY_LAG_MS);
    });
    expect(mockMeasureInWindow).toHaveBeenCalledTimes(1);
  });

  it('releases everything on unmount', async () => {
    const { unmount } = renderProvider([
      { id: 'a', key: `spot:${ETH_ASSET}`, y: 100 },
      { id: 'b', key: 'perp:BTC', y: 300 },
    ]);
    await settle();

    unmount();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'OHLCVService:unsubscribe',
      expect.objectContaining({ assetId: ETH_ASSET }),
    );
    expect(mockPerpUnsubscribe).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'OHLCVService:barUpdated',
      expect.any(Function),
    );
  });
});
