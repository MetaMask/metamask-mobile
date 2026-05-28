import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  getPrimaryRelatedMarketCollection,
  getRelatedMarketsForMarket,
} from './relatedMarkets';

const createMarket = (symbol: string): PerpsMarketData => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1.00',
  change24h: '$0.00',
  change24hPercent: '0.00%',
  volume: '$1M',
});

describe('relatedMarkets utilities', () => {
  it('resolves thematic collections before sector collections', () => {
    expect(getPrimaryRelatedMarketCollection('ONDO')).toMatchObject({
      id: 'real_world_assets',
      type: 'thematic',
    });
  });

  it('returns same-collection markets and excludes the current market', () => {
    const result = getRelatedMarketsForMarket(createMarket('RNDR'), [
      createMarket('RNDR'),
      createMarket('FET'),
      createMarket('TAO'),
      createMarket('BTC'),
    ]);

    expect(result?.collection.id).toBe('ai');
    expect(result?.markets.map((market) => market.symbol)).toStrictEqual([
      'FET',
      'TAO',
    ]);
  });

  it('returns null when the market has no collection assignment', () => {
    expect(
      getRelatedMarketsForMarket(createMarket('BTC'), [
        createMarket('BTC'),
        createMarket('ETH'),
      ]),
    ).toBeNull();
  });
});
