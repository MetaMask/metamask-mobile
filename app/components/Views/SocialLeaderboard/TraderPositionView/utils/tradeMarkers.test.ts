import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { mapTradesToMarkers } from './tradeMarkers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_TS = 1_700_000_000_000; // ms epoch
const INTERVAL = 60_000; // 1 minute between price points

/** Build an array of N price points spaced 1 minute apart (timestamps in ms). */
const makePrices = (n: number, startMs = BASE_TS): TokenPrice[] =>
  Array.from({ length: n }, (_, i) => [
    String(startMs + i * INTERVAL),
    100 + i,
  ]) as TokenPrice[];

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 1,
  usdCost: 100,
  timestamp: BASE_TS + 2 * INTERVAL, // 3rd price point by default
  transactionHash: '0xabc',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapTradesToMarkers', () => {
  describe('guard conditions', () => {
    it('returns [] when trades is undefined', () => {
      expect(mapTradesToMarkers(undefined, makePrices(5))).toEqual([]);
    });

    it('returns [] when trades is empty', () => {
      expect(mapTradesToMarkers([], makePrices(5))).toEqual([]);
    });

    it('returns [] when prices has fewer than 2 points', () => {
      const prices = makePrices(1);
      expect(mapTradesToMarkers([makeTrade()], prices)).toEqual([]);
    });

    it('returns [] when prices is empty', () => {
      expect(mapTradesToMarkers([makeTrade()], [])).toEqual([]);
    });
  });

  describe('timestamp boundary filtering', () => {
    it('drops a trade whose timestamp is before the first price point', () => {
      const prices = makePrices(5);
      const trade = makeTrade({ timestamp: BASE_TS - INTERVAL }); // 1 minute before start
      expect(mapTradesToMarkers([trade], prices)).toEqual([]);
    });

    it('drops a trade whose timestamp is after the last price point', () => {
      const prices = makePrices(5);
      const trade = makeTrade({ timestamp: BASE_TS + 10 * INTERVAL }); // beyond end
      expect(mapTradesToMarkers([trade], prices)).toEqual([]);
    });

    it('includes a trade exactly on the first timestamp', () => {
      const prices = makePrices(5);
      const trade = makeTrade({ timestamp: BASE_TS });
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers).toHaveLength(1);
      expect(markers[0].index).toBe(0);
    });

    it('includes a trade exactly on the last timestamp', () => {
      const prices = makePrices(5);
      const trade = makeTrade({ timestamp: BASE_TS + 4 * INTERVAL });
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers).toHaveLength(1);
      expect(markers[0].index).toBe(4);
    });
  });

  describe('nearest-index mapping', () => {
    it('maps a trade whose timestamp exactly matches a price point', () => {
      const prices = makePrices(10);
      const trade = makeTrade({ timestamp: BASE_TS + 3 * INTERVAL }); // index 3
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers).toHaveLength(1);
      expect(markers[0].index).toBe(3);
    });

    it('picks the closer index when timestamp falls between two price points (lower half)', () => {
      const prices = makePrices(10);
      // Falls 20% of the way between index 2 and 3 → closer to 2.
      const ts = BASE_TS + 2 * INTERVAL + Math.round(0.2 * INTERVAL);
      const trade = makeTrade({ timestamp: ts });
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers[0].index).toBe(2);
    });

    it('picks the closer index when timestamp falls between two price points (upper half)', () => {
      const prices = makePrices(10);
      // Falls 80% of the way between index 2 and 3 → closer to 3.
      const ts = BASE_TS + 2 * INTERVAL + Math.round(0.8 * INTERVAL);
      const trade = makeTrade({ timestamp: ts });
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers[0].index).toBe(3);
    });
  });

  describe('timestamp normalization (seconds vs ms)', () => {
    it('normalizes a seconds-based timestamp correctly', () => {
      const prices = makePrices(10);
      // Same point as index 3 but expressed in seconds.
      const tsSeconds = Math.floor((BASE_TS + 3 * INTERVAL) / 1000);
      const trade = makeTrade({ timestamp: tsSeconds });
      const markers = mapTradesToMarkers([trade], prices);
      expect(markers).toHaveLength(1);
      expect(markers[0].index).toBe(3);
    });
  });

  describe('intent and key fields', () => {
    it('preserves intent === "enter" for a buy trade', () => {
      const prices = makePrices(5);
      const trade = makeTrade({ intent: 'enter', transactionHash: '0x111' });
      const [marker] = mapTradesToMarkers([trade], prices);
      expect(marker.intent).toBe('enter');
      expect(marker.transactionHash).toBe('0x111');
    });

    it('preserves intent === "exit" for a sell trade', () => {
      const prices = makePrices(5);
      const trade = makeTrade({
        intent: 'exit',
        direction: 'sell',
        transactionHash: '0x222',
      });
      const [marker] = mapTradesToMarkers([trade], prices);
      expect(marker.intent).toBe('exit');
      expect(marker.transactionHash).toBe('0x222');
    });
  });

  describe('multiple trades', () => {
    it('returns one marker per in-window trade', () => {
      const prices = makePrices(10);
      const trades: Trade[] = [
        makeTrade({
          timestamp: BASE_TS + 1 * INTERVAL,
          transactionHash: '0xa',
        }),
        makeTrade({
          timestamp: BASE_TS + 5 * INTERVAL,
          transactionHash: '0xb',
        }),
        makeTrade({
          timestamp: BASE_TS - INTERVAL,
          transactionHash: '0xc',
        }), // out of window
      ];
      const markers = mapTradesToMarkers(trades, prices);
      expect(markers).toHaveLength(2);
      expect(markers.map((m) => m.transactionHash)).toEqual(['0xa', '0xb']);
    });
  });
});
