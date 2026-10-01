import {
  CandlePeriod,
  type CandleData,
  type PriceUpdate,
} from '@metamask/perps-controller';
import { getCachedPerpsHeaderQuote } from './cachedPerpsHeaderQuote';

const priceUpdate = (
  overrides: Partial<PriceUpdate> & Pick<PriceUpdate, 'symbol' | 'price'>,
): PriceUpdate => ({
  timestamp: 1,
  isTradable: true,
  percentChange24h: '0.02',
  ...overrides,
});

const chartCandles = (close: string, symbol = 'ETH'): CandleData => ({
  symbol,
  interval: CandlePeriod.FifteenMinutes,
  candles: [
    {
      time: 1,
      open: close,
      high: close,
      low: close,
      close,
      volume: '1',
    },
  ],
});

describe('getCachedPerpsHeaderQuote', () => {
  it('uses the chart close and the allMids 24h change', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('2737.9'),
      focusedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2740',
        percentChange24h: '1.2',
      }),
      cachedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2700',
        percentChange24h: '0.02',
      }),
    });

    expect(quote).toEqual({ price: 2737.9, percentChange24h: 0.02 });
  });

  it('prefers the focused price over allMids when the chart is missing', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2737.9',
        percentChange24h: '1.2',
      }),
      cachedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2700',
        percentChange24h: '0.02',
      }),
    });

    expect(quote).toEqual({ price: 2737.9, percentChange24h: 0.02 });
  });

  it('falls back to the focused 24h change when allMids has no entry', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2737.9',
        percentChange24h: '1.2',
      }),
      cachedPrice: null,
    });

    expect(quote).toEqual({ price: 2737.9, percentChange24h: 1.2 });
  });

  it('uses the allMids price when neither chart nor focused price exists', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: null,
      cachedPrice: priceUpdate({ symbol: 'ETH', price: '2700' }),
    });

    expect(quote).toEqual({ price: 2700, percentChange24h: 0.02 });
  });

  it('ignores a cached update for a different symbol', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('100', 'BTC'),
      focusedPrice: priceUpdate({ symbol: 'BTC', price: '100' }),
      cachedPrice: priceUpdate({ symbol: 'BTC', price: '100' }),
    });

    expect(quote).toBeNull();
  });

  it('returns null when every cached price is non-positive', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('0'),
      focusedPrice: priceUpdate({ symbol: 'ETH', price: 'NaN' }),
      cachedPrice: priceUpdate({ symbol: 'ETH', price: '-1' }),
    });

    expect(quote).toBeNull();
  });

  it('keeps a flat 24h change', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: null,
      cachedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2737.9',
        percentChange24h: '0',
      }),
    });

    expect(quote?.percentChange24h).toBe(0);
  });

  it('returns a null 24h change when no cached update has one', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('2737.9'),
      focusedPrice: null,
      cachedPrice: null,
    });

    expect(quote).toEqual({ price: 2737.9, percentChange24h: null });
  });
});
