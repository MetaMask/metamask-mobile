import { parseVolume, type OrderBookData } from '@metamask/perps-controller';
import { calculateMarketOrderLiquidity } from '../../../app/components/UI/Perps/utils/slippageCalculation';
import {
  createE2EMockStreamManager,
  E2EControllerOverrides,
} from './perps-controller-mixin';

/**
 * Contract tests for the E2E Perps stream manager stub.
 *
 * Production `PerpsStreamManager` channels expose sync `getSnapshot()` for cold-start reads.
 * Hooks such as `usePerpsMarkets`, `usePerpsLivePositions`, and `usePerpsLiveAccount` call
 * these on render. If the E2E mock omits them, the app throws `TypeError: undefined is not a function`
 * after login (see PR #27898).
 */

/** Root keys on `PerpsStreamManager` that the E2E plain-object mock must provide. */
const EXPECTED_E2E_STREAM_ROOT_KEYS = [
  'account',
  'candles',
  'fills',
  'focusedPrice',
  'marketData',
  'oiCaps',
  'orders',
  'positions',
  'prices',
  'topOfBook',
] as const;

/**
 * Channels that must implement synchronous `getSnapshot()` like `StreamChannel` in production.
 * Keep aligned with hooks that read `streamManager.<channel>.getSnapshot()` on mount.
 */
const CHANNELS_REQUIRING_GET_SNAPSHOT = [
  'prices',
  'marketData',
  'account',
  'fills',
  'orders',
  'positions',
] as const;

/**
 * Channels that expose `getLastDeliveredAt()` like production `StreamChannel`.
 * `usePerpsOrderExecution` calls this after a successful resting limit submit;
 * missing it throws and surfaces the "Order failed" toast in E2E.
 */
const CHANNELS_REQUIRING_GET_LAST_DELIVERED_AT = [
  'account',
  'orders',
  'positions',
] as const;

describe('createE2EMockStreamManager', () => {
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    mockConsoleLog = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  it('returns an object whose top-level keys match the real PerpsStreamManager channel surface', () => {
    const manager = createE2EMockStreamManager() as Record<string, unknown>;

    const keys = Object.keys(manager).sort((a, b) => a.localeCompare(b));
    const expected = [...EXPECTED_E2E_STREAM_ROOT_KEYS].sort((a, b) =>
      a.localeCompare(b),
    );

    expect(keys).toEqual(expected);
  });

  it.each(CHANNELS_REQUIRING_GET_SNAPSHOT)(
    'channel %s exposes synchronous getSnapshot callable without throwing',
    (channel) => {
      const manager = createE2EMockStreamManager() as Record<
        string,
        { getSnapshot?: unknown }
      >;

      const snap = manager[channel]?.getSnapshot;

      expect(typeof snap).toBe('function');

      expect(() => (snap as () => unknown)()).not.toThrow();
    },
  );

  it.each(CHANNELS_REQUIRING_GET_LAST_DELIVERED_AT)(
    'channel %s exposes getLastDeliveredAt callable without throwing',
    (channel) => {
      const manager = createE2EMockStreamManager() as Record<
        string,
        { getLastDeliveredAt?: unknown }
      >;

      const getLastDeliveredAt = manager[channel]?.getLastDeliveredAt;

      expect(typeof getLastDeliveredAt).toBe('function');
      expect(() => (getLastDeliveredAt as () => number | null)()).not.toThrow();
    },
  );

  it('exposes marketData.refresh like production MarketDataChannel', () => {
    const manager = createE2EMockStreamManager() as {
      marketData: { refresh?: unknown };
    };

    expect(typeof manager.marketData.refresh).toBe('function');
  });

  it('provides market data with open interest so production E2E builds do not filter every market out', () => {
    const manager = createE2EMockStreamManager() as {
      marketData: { getSnapshot: () => { openInterest?: string }[] };
    };

    const markets = manager.marketData.getSnapshot();

    expect(markets.length).toBeGreaterThan(0);
    expect(
      markets.every((market) => {
        if (!market.openInterest) {
          return false;
        }

        return parseVolume(market.openInterest) > 0;
      }),
    ).toBe(true);
  });
});

describe('E2EControllerOverrides.subscribeToOrderBook', () => {
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockConsoleLog = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    jest.useRealTimers();
  });

  it.each([true, false])(
    'emits a book deep enough for market orders to pass the liquidity guard (isBuy=%s)',
    (isBuy) => {
      const overrides = new E2EControllerOverrides({});
      const callback = jest.fn<void, [OrderBookData]>();

      overrides.subscribeToOrderBook({ symbol: 'BTC', levels: 10, callback });
      jest.runAllTimers();

      expect(callback).toHaveBeenCalledTimes(1);
      const orderBook = callback.mock.calls[0][0];
      expect(orderBook.bids).toHaveLength(10);
      expect(orderBook.asks).toHaveLength(10);
      expect(
        calculateMarketOrderLiquidity({
          orderBook,
          sizeUsd: 100_000,
          isBuy,
          currentPrice: Number(orderBook.midPrice),
          maxSlippageBps: 300,
          szDecimals: 5,
        }).canFillWithinSlippage,
      ).toBe(true);
    },
  );

  it('emits nothing for a symbol without a mock price', () => {
    const overrides = new E2EControllerOverrides({});
    const callback = jest.fn();

    overrides.subscribeToOrderBook({ symbol: 'UNKNOWN', callback });
    jest.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });
});
