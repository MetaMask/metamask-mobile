import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  getRelatedMarketCollection,
  getRelatedMarketsForMarket,
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
  it('resolves the collection from the market category', () => {
    expect(
      getRelatedMarketCollection(
        createMarket('xyz:AAPL', { marketType: 'equity', isHip3: true }),
      ),
    ).toMatchObject({
      id: 'stocks',
      label: 'Stocks',
    });
  });

  it('returns same-category markets and excludes the current market', () => {
    const result = getRelatedMarketsForMarket(
      createMarket('xyz:AAPL', { marketType: 'equity', isHip3: true }),
      [
        createMarket('xyz:AAPL', { marketType: 'equity', isHip3: true }),
        createMarket('xyz:MSFT', { marketType: 'equity', isHip3: true }),
        createMarket('xyz:GOLD', { marketType: 'commodity', isHip3: true }),
      ],
    );

    expect(result?.collection.id).toBe('stocks');
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'xyz:MSFT',
    ]);
  });

  it('uses crypto as the category for main DEX markets', () => {
    const result = getRelatedMarketsForMarket(createMarket('FET'), [
      createMarket('FET'),
      createMarket('TAO'),
      createMarket('BTC'),
    ]);

    expect(result?.collection.id).toBe('crypto');
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'TAO',
      'BTC',
    ]);
  });

  it('returns null when a HIP-3 market has no category assignment', () => {
    expect(
      getRelatedMarketsForMarket(
        createMarket('builder:XYZ', { isHip3: true }),
        [createMarket('builder:XYZ', { isHip3: true })],
      ),
    ).toBeNull();
  });
});
