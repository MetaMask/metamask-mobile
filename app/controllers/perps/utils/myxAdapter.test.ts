import BigNumber from 'bignumber.js';

import { MYX_PRICE_DECIMALS } from '../constants/myxConfig';
import type { MarketDataFormatters } from '../types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';

import {
  adaptMarketFromMYX,
  adaptPriceFromMYX,
  adaptMarketDataFromMYX,
  filterMYXExclusiveMarkets,
  isOverlappingMarket,
  buildPoolSymbolMap,
  buildSymbolPoolsMap,
  extractSymbolFromPoolId,
} from './myxAdapter';

// Mock formatters matching the MarketDataFormatters interface
const mockFormatters: MarketDataFormatters = {
  formatVolume: (v: number) => `$${v.toFixed(0)}`,
  formatPerpsFiat: (v: number) => `$${v.toFixed(2)}`,
  formatPercentage: (p: number) => `${p.toFixed(2)}%`,
  priceRangesUniversal: [],
};

// Helper: create a minimal MYXPoolSymbol fixture
function makePool(overrides: Partial<MYXPoolSymbol> = {}): MYXPoolSymbol {
  return {
    chainId: 56,
    marketId: 'market-1',
    poolId: '0xpool1',
    baseSymbol: 'RHEA',
    quoteSymbol: 'USDT',
    baseTokenIcon: '',
    baseToken: '0xbase',
    quoteToken: '0xquote',
    ...overrides,
  };
}

// Helper: create a minimal MYXTicker fixture
function makeTicker(overrides: Partial<MYXTicker> = {}): MYXTicker {
  return {
    chainId: 56,
    poolId: '0xpool1',
    oracleId: 1,
    price: new BigNumber(1500)
      .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
      .toFixed(0),
    change: '2.5',
    high: '0',
    low: '0',
    volume: '1000000',
    turnover: '0',
    ...overrides,
  };
}

describe('myxAdapter', () => {
  describe('adaptMarketFromMYX', () => {
    it('returns correct MarketInfo from a pool with baseSymbol', () => {
      const pool = makePool({ baseSymbol: 'PARTI' });
      const market = adaptMarketFromMYX(pool);

      expect(market.name).toBe('PARTI');
      expect(market.szDecimals).toBe(18);
      expect(market.maxLeverage).toBe(100);
      expect(market.providerId).toBe('myx');
      expect(market.marginTableId).toBe(0);
      expect(market.minimumOrderSize).toBe(10);
    });

    it('falls back to poolId when baseSymbol is missing', () => {
      const pool = makePool({ baseSymbol: '', poolId: '0xfallback' });
      const market = adaptMarketFromMYX(pool);

      expect(market.name).toBe('0xfallback');
    });
  });

  describe('adaptPriceFromMYX', () => {
    it('returns correct price and change24h from valid ticker', () => {
      const ticker = makeTicker({ change: '3.14' });
      const result = adaptPriceFromMYX(ticker);

      expect(Number.parseFloat(result.price)).toBe(1500);
      expect(result.change24h).toBe(3.14);
    });

    it('defaults change24h to 0 when change is falsy', () => {
      const ticker = makeTicker({ change: '' });
      const result = adaptPriceFromMYX(ticker);

      expect(result.change24h).toBe(0);
    });

    it('returns "0" price for zero-value ticker', () => {
      const ticker = makeTicker({ price: '0' });
      const result = adaptPriceFromMYX(ticker);

      expect(result.price).toBe('0');
    });
  });

  describe('adaptMarketDataFromMYX', () => {
    it('returns full data when ticker is provided', () => {
      const pool = makePool({ baseSymbol: 'RHEA' });
      const ticker = makeTicker();
      const data = adaptMarketDataFromMYX(pool, ticker, mockFormatters);

      expect(data.symbol).toBe('RHEA');
      expect(data.providerId).toBe('myx');
      expect(data.maxLeverage).toBe('100x');
      // Price should be formatted (non-zero)
      expect(data.price).toBeDefined();
      expect(data.volume).toBeDefined();
    });

    it('returns zeroed prices when ticker is omitted', () => {
      const pool = makePool({ baseSymbol: 'SKYAI' });
      const data = adaptMarketDataFromMYX(pool, undefined, mockFormatters);

      expect(data.symbol).toBe('SKYAI');
      expect(data.providerId).toBe('myx');
      expect(data.maxLeverage).toBe('100x');
    });
  });

  describe('filterMYXExclusiveMarkets', () => {
    it('filters out overlapping markets (BTC, ETH, BNB, PUMP, WLFI)', () => {
      const pools = [
        makePool({ baseSymbol: 'BTC' }),
        makePool({ baseSymbol: 'ETH' }),
        makePool({ baseSymbol: 'BNB' }),
        makePool({ baseSymbol: 'PUMP' }),
        makePool({ baseSymbol: 'WLFI' }),
        makePool({ baseSymbol: 'RHEA' }),
        makePool({ baseSymbol: 'PARTI' }),
      ];

      const result = filterMYXExclusiveMarkets(pools);
      const symbols = result.map((p) => p.baseSymbol);

      expect(symbols).toEqual(['RHEA', 'PARTI']);
    });

    it('returns all pools when none overlap', () => {
      const pools = [
        makePool({ baseSymbol: 'RHEA' }),
        makePool({ baseSymbol: 'SKYAI' }),
      ];

      expect(filterMYXExclusiveMarkets(pools)).toHaveLength(2);
    });
  });

  describe('isOverlappingMarket', () => {
    it('returns true for BTC', () => {
      expect(isOverlappingMarket('BTC')).toBe(true);
    });

    it('returns true for ETH', () => {
      expect(isOverlappingMarket('ETH')).toBe(true);
    });

    it('returns false for MYX-exclusive symbol', () => {
      expect(isOverlappingMarket('RHEA')).toBe(false);
    });
  });

  describe('buildPoolSymbolMap', () => {
    it('builds a map from poolId to symbol', () => {
      const pools = [
        makePool({ poolId: '0xA', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xB', baseSymbol: 'PARTI' }),
      ];

      const map = buildPoolSymbolMap(pools);

      expect(map.get('0xA')).toBe('RHEA');
      expect(map.get('0xB')).toBe('PARTI');
      expect(map.size).toBe(2);
    });

    it('returns an empty map for empty input', () => {
      expect(buildPoolSymbolMap([]).size).toBe(0);
    });
  });

  describe('buildSymbolPoolsMap', () => {
    it('groups poolIds by symbol', () => {
      const pools = [
        makePool({ poolId: '0xA', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xB', baseSymbol: 'RHEA' }),
        makePool({ poolId: '0xC', baseSymbol: 'PARTI' }),
      ];

      const map = buildSymbolPoolsMap(pools);

      expect(map.get('RHEA')).toEqual(['0xA', '0xB']);
      expect(map.get('PARTI')).toEqual(['0xC']);
    });

    it('returns empty map for empty input', () => {
      expect(buildSymbolPoolsMap([]).size).toBe(0);
    });
  });

  describe('extractSymbolFromPoolId', () => {
    it('returns poolId as fallback', () => {
      expect(extractSymbolFromPoolId('0xSomePool')).toBe('0xSomePool');
    });
  });
});
