import type { PriceUpdate } from '@metamask/perps-controller';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../../../util/deviceCapability/types';
import {
  getPerpsTileDisplayValues,
  getPerpsTileLivePriceThrottleMs,
  PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS,
  PERPS_TILE_LIVE_PRICE_THROTTLE_MS,
} from './PerpsMarketTileCard.utils';

const DEFAULT = PERPS_TILE_LIVE_PRICE_THROTTLE_MS;
const CONSTRAINED = PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS;

const buildLivePrice = (overrides: Partial<PriceUpdate> = {}): PriceUpdate => ({
  symbol: 'BTC',
  price: '78343.2',
  timestamp: 1,
  isTradable: true,
  percentChange24h: '1.50',
  ...overrides,
});

describe('getPerpsTileLivePriceThrottleMs', () => {
  it.each<[HardwareTier | null, NetworkTier | null, number | null]>([
    ['LOW', 'NONE', null],
    ['MID', 'NONE', null],
    ['HIGH', 'NONE', null],
    [null, 'NONE', null],
    ['LOW', 'SLOW_CELLULAR', CONSTRAINED],
    ['MID', 'SLOW_CELLULAR', CONSTRAINED],
    ['HIGH', 'SLOW_CELLULAR', CONSTRAINED],
    [null, 'SLOW_CELLULAR', CONSTRAINED],
    ['LOW', 'FAST_CELLULAR', CONSTRAINED],
    ['LOW', 'WIFI', CONSTRAINED],
    ['MID', 'FAST_CELLULAR', DEFAULT],
    ['MID', 'WIFI', DEFAULT],
    ['HIGH', 'FAST_CELLULAR', DEFAULT],
    ['HIGH', 'WIFI', DEFAULT],
    [null, 'FAST_CELLULAR', DEFAULT],
    [null, 'WIFI', DEFAULT],
    ['LOW', null, DEFAULT],
    ['MID', null, DEFAULT],
    ['HIGH', null, DEFAULT],
    [null, null, DEFAULT],
  ])(
    '%p hardware on %p network returns %p',
    (hardwareTier, networkTier, expected) => {
      const result = getPerpsTileLivePriceThrottleMs({
        hardwareTier,
        networkTier,
      });

      expect(result).toBe(expected);
    },
  );

  it('returns the default throttle when tiers are not provided', () => {
    const result = getPerpsTileLivePriceThrottleMs();

    expect(result).toBe(DEFAULT);
  });

  it('uses a slower throttle for constrained devices than the default', () => {
    expect(CONSTRAINED).toBeGreaterThan(DEFAULT);
  });
});

describe('getPerpsTileDisplayValues', () => {
  const market = { price: '$78,000', change24hPercent: '+1.20%' };

  it('returns the snapshot values when no live price is available', () => {
    const result = getPerpsTileDisplayValues(market);

    expect(result).toEqual({ price: '$78,000', changePercent: '+1.20%' });
  });

  it('returns the live price and change percent when a tick is available', () => {
    const result = getPerpsTileDisplayValues(market, buildLivePrice());

    expect(result).toEqual({ price: '$78,343', changePercent: '+1.50%' });
  });

  it('formats a negative live change percent', () => {
    const result = getPerpsTileDisplayValues(
      market,
      buildLivePrice({ percentChange24h: '-2.88' }),
    );

    expect(result.changePercent).toBe('-2.88%');
  });

  it('keeps the snapshot change percent when the tick has no change percent', () => {
    const result = getPerpsTileDisplayValues(
      market,
      buildLivePrice({ percentChange24h: undefined }),
    );

    expect(result).toEqual({ price: '$78,343', changePercent: '+1.20%' });
  });

  it.each(['0', '-1', 'NaN', ''])(
    'keeps the snapshot price when the live price is %p',
    (price) => {
      const result = getPerpsTileDisplayValues(
        market,
        buildLivePrice({ price }),
      );

      expect(result.price).toBe('$78,000');
    },
  );

  it('returns the fallback price display when the snapshot price is empty', () => {
    const result = getPerpsTileDisplayValues({ ...market, price: '' });

    expect(result.price).toBe('$---');
  });

  it('keeps the fallback price display from the snapshot', () => {
    const result = getPerpsTileDisplayValues({ ...market, price: '$---' });

    expect(result.price).toBe('$---');
  });

  it.each([
    ['0.00%', '+0.00%'],
    ['+1,234.56%', '+1234.56%'],
    ['-2.88%', '-2.88%'],
    ['+0.07%', '+0.07%'],
  ])(
    'formats snapshot change %p the same way as a live tick (%p)',
    (snapshotPercent, expected) => {
      const snapshot = getPerpsTileDisplayValues({
        ...market,
        change24hPercent: snapshotPercent,
      });
      const live = getPerpsTileDisplayValues(
        market,
        buildLivePrice({
          percentChange24h: expected.replace(/[+%]/g, ''),
        }),
      );

      expect(snapshot.changePercent).toBe(expected);
      expect(live.changePercent).toBe(expected);
    },
  );
});
