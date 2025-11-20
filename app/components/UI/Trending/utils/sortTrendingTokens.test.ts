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
  describe('PriceChange sorting', () => {
    it('sorts by price change descending (default)', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          priceChangePct: { h24: '2.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result[0].symbol).toBe('TOKEN2'); // Highest price change
      expect(result[1].symbol).toBe('TOKEN1');
      expect(result[2].symbol).toBe('TOKEN3'); // Lowest price change
    });

    it('sorts by price change ascending', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          priceChangePct: { h24: '2.0' },
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.PriceChange,
        SortDirection.Ascending,
      );

      expect(result[0].symbol).toBe('TOKEN3'); // Lowest price change
      expect(result[1].symbol).toBe('TOKEN1');
      expect(result[2].symbol).toBe('TOKEN2'); // Highest price change
    });

    it('handles missing priceChangePct.h24 by treating as 0', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: '5.0' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: undefined,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          priceChangePct: { h24: '10.0' },
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.PriceChange,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN3'); // Highest
      expect(result[1].symbol).toBe('TOKEN1');
      expect(result[2].symbol).toBe('TOKEN2'); // Missing value treated as 0
    });

    it('handles invalid priceChangePct.h24 string by treating as 0', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: 'invalid' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: { h24: '5.0' },
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.PriceChange,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN2');
      expect(result[1].symbol).toBe('TOKEN1'); // Invalid value treated as 0
    });

    it('handles negative price changes correctly', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: '-5.0' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          priceChangePct: { h24: '-2.0' },
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.PriceChange,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN2'); // Highest (positive)
      expect(result[1].symbol).toBe('TOKEN3'); // Less negative
      expect(result[2].symbol).toBe('TOKEN1'); // Most negative
    });
  });

  describe('Volume sorting', () => {
    it('sorts by volume descending', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          aggregatedUsdVolume: 1000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          aggregatedUsdVolume: 5000000,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          aggregatedUsdVolume: 2000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.Volume,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN2'); // Highest volume
      expect(result[1].symbol).toBe('TOKEN3');
      expect(result[2].symbol).toBe('TOKEN1'); // Lowest volume
    });

    it('sorts by volume ascending', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          aggregatedUsdVolume: 1000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          aggregatedUsdVolume: 5000000,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          aggregatedUsdVolume: 2000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.Volume,
        SortDirection.Ascending,
      );

      expect(result[0].symbol).toBe('TOKEN1'); // Lowest volume
      expect(result[1].symbol).toBe('TOKEN3');
      expect(result[2].symbol).toBe('TOKEN2'); // Highest volume
    });

    it('handles missing aggregatedUsdVolume by treating as 0', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          aggregatedUsdVolume: 1000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          aggregatedUsdVolume: undefined,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          aggregatedUsdVolume: 5000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.Volume,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN3'); // Highest
      expect(result[1].symbol).toBe('TOKEN1');
      expect(result[2].symbol).toBe('TOKEN2'); // Missing value treated as 0
    });
  });

  describe('MarketCap sorting', () => {
    it('sorts by market cap descending', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          marketCap: 10000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          marketCap: 50000000,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          marketCap: 20000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.MarketCap,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN2'); // Highest market cap
      expect(result[1].symbol).toBe('TOKEN3');
      expect(result[2].symbol).toBe('TOKEN1'); // Lowest market cap
    });

    it('sorts by market cap ascending', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          marketCap: 10000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          marketCap: 50000000,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          marketCap: 20000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.MarketCap,
        SortDirection.Ascending,
      );

      expect(result[0].symbol).toBe('TOKEN1'); // Lowest market cap
      expect(result[1].symbol).toBe('TOKEN3');
      expect(result[2].symbol).toBe('TOKEN2'); // Highest market cap
    });

    it('handles missing marketCap by treating as 0', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          marketCap: 10000000,
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          marketCap: undefined,
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          marketCap: 50000000,
        }),
      ];

      const result = sortTrendingTokens(
        tokens,
        PriceChangeOption.MarketCap,
        SortDirection.Descending,
      );

      expect(result[0].symbol).toBe('TOKEN3'); // Highest
      expect(result[1].symbol).toBe('TOKEN1');
      expect(result[2].symbol).toBe('TOKEN2'); // Missing value treated as 0
    });
  });

  describe('Default parameters', () => {
    it('uses PriceChange and Descending as defaults', () => {
      const tokens: TrendingAsset[] = [
        createMockToken({
          assetId: 'token1',
          symbol: 'TOKEN1',
          priceChangePct: { h24: '2.0' },
        }),
        createMockToken({
          assetId: 'token2',
          symbol: 'TOKEN2',
          priceChangePct: { h24: '10.0' },
        }),
        createMockToken({
          assetId: 'token3',
          symbol: 'TOKEN3',
          priceChangePct: { h24: '5.0' },
        }),
      ];

      const result = sortTrendingTokens(tokens);

      expect(result[0].symbol).toBe('TOKEN2'); // Highest price change
      expect(result[1].symbol).toBe('TOKEN3');
      expect(result[2].symbol).toBe('TOKEN1'); // Lowest price change
    });
  });
});
