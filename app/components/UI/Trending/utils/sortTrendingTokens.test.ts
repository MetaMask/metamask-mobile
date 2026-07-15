import type { TrendingAsset } from '@metamask/assets-controllers';
import { sortTrendingTokens } from './sortTrendingTokens';
import {
  PriceChangeOption,
  SortDirection,
} from '../components/TrendingTokensBottomSheet';

const createMockToken = (
  overrides?: Partial<TrendingAsset>,
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  price: '1.00',
  priceChangePct: { h24: '0.5' },
  aggregatedUsdVolume: 1000000,
  marketCap: 50000000,
  ...overrides,
});

describe('sortTrendingTokens', () => {
  it('returns empty array for empty input', () => {
    expect(sortTrendingTokens([])).toEqual([]);
  });

  describe('PriceChange sorting', () => {
    it('sorts by price change descending (default)', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          priceChangePct: { h24: '2.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result.map((t) => t.symbol)).toEqual(['B', 'A', 'C']);
    });

    it('sorts by price change ascending', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          priceChangePct: { h24: '2.0' },
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.PriceChange,
        SortDirection.Ascending,
      );

      expect(result.map((t) => t.symbol)).toEqual(['C', 'A', 'B']);
    });

    it('handles missing priceChangePct by treating value as 0', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: undefined,
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          priceChangePct: { h24: '10.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result.map((t) => t.symbol)).toEqual(['C', 'A', 'B']);
    });

    it('handles invalid priceChangePct string by treating value as 0', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          priceChangePct: { h24: 'invalid' },
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: { h24: '5.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result.map((t) => t.symbol)).toEqual(['B', 'A']);
    });

    it('sorts negative price changes correctly', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          priceChangePct: { h24: '-5.0' },
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          priceChangePct: { h24: '-2.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result.map((t) => t.symbol)).toEqual(['B', 'C', 'A']);
    });

    it('pushes tokens with no price data to end', () => {
      const tokens = [
        createMockToken({ assetId: 'a', symbol: 'A', price: undefined }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          priceChangePct: { h24: '3.0' },
        }),
        createMockToken({ assetId: 'c', symbol: 'C', price: '0' }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result[0].symbol).toBe('B');
      expect(result.slice(1).map((t) => t.symbol)).toEqual(
        expect.arrayContaining(['A', 'C']),
      );
    });
  });

  describe('Volume sorting', () => {
    it('sorts by volume descending', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          aggregatedUsdVolume: 1000000,
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          aggregatedUsdVolume: 5000000,
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          aggregatedUsdVolume: 2000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.Volume,
        SortDirection.Descending,
      );

      expect(result.map((t) => t.symbol)).toEqual(['B', 'C', 'A']);
    });

    it('pushes tokens with no volume to end', () => {
      const tokens = [
        createMockToken({
          assetId: 'a',
          symbol: 'A',
          aggregatedUsdVolume: 1000000,
        }),
        createMockToken({
          assetId: 'b',
          symbol: 'B',
          aggregatedUsdVolume: undefined,
        }),
        createMockToken({
          assetId: 'c',
          symbol: 'C',
          aggregatedUsdVolume: 5000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.Volume,
        SortDirection.Descending,
      );

      expect(result.map((t) => t.symbol)).toEqual(['C', 'A', 'B']);
    });
  });

  describe('MarketCap sorting', () => {
    it('sorts by market cap descending', () => {
      const tokens = [
        createMockToken({ assetId: 'a', symbol: 'A', marketCap: 10000000 }),
        createMockToken({ assetId: 'b', symbol: 'B', marketCap: 50000000 }),
        createMockToken({ assetId: 'c', symbol: 'C', marketCap: 20000000 }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.MarketCap,
        SortDirection.Descending,
      );

      expect(result.map((t) => t.symbol)).toEqual(['B', 'C', 'A']);
    });

    it('pushes tokens with no market cap to end', () => {
      const tokens = [
        createMockToken({ assetId: 'a', symbol: 'A', marketCap: 10000000 }),
        createMockToken({ assetId: 'b', symbol: 'B', marketCap: undefined }),
        createMockToken({ assetId: 'c', symbol: 'C', marketCap: 50000000 }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.MarketCap,
        SortDirection.Descending,
      );

      expect(result.map((t) => t.symbol)).toEqual(['C', 'A', 'B']);
    });
  });
});
