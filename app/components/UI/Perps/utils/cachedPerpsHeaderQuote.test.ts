import {
  CandlePeriod,
  type CandleData,
  type PriceUpdate,
} from '@metamask/perps-controller';
import {
  getCachedPerpsHeaderQuote,
  resolveTradeSheetHeaderChange,
  resolveTradeSheetHeaderPrice,
} from './cachedPerpsHeaderQuote';

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
  it('uses the chart close and the cached 24h change', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('2737.9'),
      focusedPrice: priceUpdate({ symbol: 'ETH', price: '2740' }),
      priceSnapshot: {
        ETH: priceUpdate({
          symbol: 'ETH',
          price: '2700',
          percentChange24h: '0.02',
        }),
      },
    });

    expect(quote).toEqual({
      price: 2737.9,
      percentChange24h: 0.02,
      matchesChartPrice: true,
    });
  });

  it('prefers the focused price cache over allMids when the chart is missing', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: priceUpdate({
        symbol: 'ETH',
        price: '2737.9',
        percentChange24h: '1.2',
      }),
      priceSnapshot: {
        ETH: priceUpdate({
          symbol: 'ETH',
          price: '2700',
          percentChange24h: '0.02',
        }),
      },
    });

    expect(quote).toEqual({
      price: 2737.9,
      percentChange24h: 1.2,
      matchesChartPrice: false,
    });
  });

  it('ignores a cached update for a different symbol', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: chartCandles('100', 'BTC'),
      focusedPrice: priceUpdate({ symbol: 'BTC', price: '100' }),
      priceSnapshot: {
        BTC: priceUpdate({ symbol: 'BTC', price: '100' }),
      },
    });

    expect(quote).toBeNull();
  });

  it('keeps a flat 24h change', () => {
    const quote = getCachedPerpsHeaderQuote({
      asset: 'ETH',
      candleData: null,
      focusedPrice: null,
      priceSnapshot: {
        ETH: priceUpdate({
          symbol: 'ETH',
          price: '2737.9',
          percentChange24h: '0',
        }),
      },
    });

    expect(quote?.percentChange24h).toBe(0);
  });
});

describe('resolveTradeSheetHeaderPrice', () => {
  const chartQuote = {
    price: 2737.9,
    percentChange24h: 0.02,
    matchesChartPrice: true,
  };
  const cachedMid = {
    price: 2700,
    percentChange24h: 0.02,
    matchesChartPrice: false,
  };

  it('keeps the chart price when a live mid arrives', () => {
    expect(
      resolveTradeSheetHeaderPrice({
        cachedQuote: chartQuote,
        livePrice: 2740,
      }),
    ).toBe(2737.9);
  });

  it('uses the live price ahead of a cached mid', () => {
    expect(
      resolveTradeSheetHeaderPrice({
        cachedQuote: cachedMid,
        livePrice: 2740,
      }),
    ).toBe(2740);
  });

  it('uses the cached mid before the live subscription has a price', () => {
    expect(
      resolveTradeSheetHeaderPrice({
        cachedQuote: cachedMid,
        livePrice: 0,
      }),
    ).toBe(2700);
  });
});

describe('resolveTradeSheetHeaderChange', () => {
  const cachedQuote = {
    price: 2737.9,
    percentChange24h: 0.02,
    matchesChartPrice: true,
  };

  it('uses the live change once a live price exists', () => {
    expect(
      resolveTradeSheetHeaderChange({
        cachedQuote,
        hasLivePrice: true,
        livePercent: 1.5,
      }),
    ).toBe(1.5);
  });

  it('uses the cached change before the live price exists', () => {
    expect(
      resolveTradeSheetHeaderChange({
        cachedQuote,
        hasLivePrice: false,
        livePercent: null,
      }),
    ).toBe(0.02);
  });
});
