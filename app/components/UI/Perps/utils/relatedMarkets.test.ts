import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  getRelatedMarketsForMarket,
  hasRelatedMarketsCategory,
} from './relatedMarkets';

const createMarket = (
  symbol: string,
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1.00',
  change24h: '$0.00',
  change24hPercent: '0.00%',
  volume: '$1M',
  ...overrides,
});

describe('relatedMarkets utilities', () => {
  it('resolves a HIP-3 category collection from the controller classification', () => {
    // Arrange
    const current = createMarket('xyz:AAPL', {
      marketType: 'stock',
      isHip3: true,
    });

    // Act
    const result = getRelatedMarketsForMarket(current, [
      current,
      createMarket('xyz:MSFT', { marketType: 'stock', isHip3: true }),
    ]);

    // Assert
    expect(result?.collection).toMatchObject({ id: 'stock', label: 'Stocks' });
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'xyz:MSFT',
    ]);
  });

  it('returns same-category markets and excludes the current market and other categories', () => {
    // Arrange
    const current = createMarket('xyz:AAPL', {
      marketType: 'stock',
      isHip3: true,
    });

    // Act
    const result = getRelatedMarketsForMarket(current, [
      current,
      createMarket('xyz:MSFT', { marketType: 'stock', isHip3: true }),
      createMarket('xyz:GOLD', { marketType: 'commodity', isHip3: true }),
      createMarket('xyz:SPY', { marketType: 'etf', isHip3: true }),
    ]);

    // Assert
    expect(result?.collection.id).toBe('stock');
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'xyz:MSFT',
    ]);
  });

  it('keeps each HIP-3 category separate (no equity bucketing)', () => {
    // Arrange
    const current = createMarket('xyz:SPY', {
      marketType: 'etf',
      isHip3: true,
    });

    // Act
    const result = getRelatedMarketsForMarket(current, [
      createMarket('xyz:QQQ', { marketType: 'etf', isHip3: true }),
      createMarket('xyz:AAPL', { marketType: 'stock', isHip3: true }),
      createMarket('xyz:SPX', { marketType: 'index', isHip3: true }),
    ]);

    // Assert
    expect(result?.collection).toMatchObject({ id: 'etf', label: 'ETFs' });
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'xyz:QQQ',
    ]);
  });

  it('uses crypto for main DEX (non-HIP-3) markets', () => {
    // Arrange
    const current = createMarket('FET');

    // Act
    const result = getRelatedMarketsForMarket(current, [
      current,
      createMarket('TAO'),
      createMarket('BTC'),
    ]);

    // Assert
    expect(result?.collection).toMatchObject({ id: 'crypto', label: 'Crypto' });
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'TAO',
      'BTC',
    ]);
  });

  it('excludes the current market case-insensitively', () => {
    // Arrange — route symbol casing differs from the streamed list entry
    const current = createMarket('eth');

    // Act
    const result = getRelatedMarketsForMarket(current, [
      createMarket('ETH'),
      createMarket('BTC'),
    ]);

    // Assert — the current market is dropped despite the casing mismatch
    expect(result?.collection.id).toBe('crypto');
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'BTC',
    ]);
  });

  it('returns null for uncategorised HIP-3 markets (controller "new" bucket)', () => {
    // Arrange — the controller classifies an uncategorised HIP-3 market as
    // 'new', but mobile's "New" means "listed in the last 30 days", so this
    // must not surface a Related markets rail.
    const current = createMarket('builder:XYZ', { isHip3: true });

    // Act
    const result = getRelatedMarketsForMarket(current, [
      current,
      createMarket('builder:ABC', { isHip3: true }),
    ]);

    // Assert
    expect(result).toBeNull();
  });

  it('hasRelatedMarketsCategory is true for categorised markets', () => {
    expect(
      hasRelatedMarketsCategory(
        createMarket('xyz:AAPL', { marketType: 'stock', isHip3: true }),
      ),
    ).toBe(true);
    expect(hasRelatedMarketsCategory(createMarket('FET'))).toBe(true);
  });

  it('hasRelatedMarketsCategory is false without a symbol or category', () => {
    expect(hasRelatedMarketsCategory(null)).toBe(false);
    expect(hasRelatedMarketsCategory(undefined)).toBe(false);
    expect(hasRelatedMarketsCategory(createMarket(''))).toBe(false);
  });

  it('hasRelatedMarketsCategory is false for uncategorised HIP-3 markets (controller "new" bucket)', () => {
    expect(
      hasRelatedMarketsCategory(createMarket('builder:XYZ', { isHip3: true })),
    ).toBe(false);
  });

  it('returns null when there are no other markets in the category', () => {
    // Arrange
    const current = createMarket('xyz:AAPL', {
      marketType: 'stock',
      isHip3: true,
    });

    // Act + Assert
    expect(getRelatedMarketsForMarket(current, [current])).toBeNull();
  });
});
