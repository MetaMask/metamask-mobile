import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  buildWatchlistItems,
  canUseWatchlistLivePrices,
  createUnifiedWatchlistPerp,
  createUnifiedWatchlistToken,
} from './utils';

const TOKEN = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  price: '2000',
  marketCap: 1,
  aggregatedUsdVolume: 1,
  priceChangePct: { h24: '1' },
} as TrendingAsset;

const PERP = {
  symbol: 'ETH',
  name: 'Ethereum Perpetual',
  maxLeverage: '50x',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.50%',
  volume: '$1.5B',
  openInterest: '$500M',
} as PerpsMarketData;

describe('watchlist utils', () => {
  it('keeps same-ticker token and Perps rows with separate identities', () => {
    const token = createUnifiedWatchlistToken(TOKEN);
    const perp = createUnifiedWatchlistPerp(PERP);

    const result = buildWatchlistItems([token], [perp]);

    expect(result.map((item) => item.key)).toEqual([
      'token:eip155:1/slip44:60',
      'perp:eth',
    ]);
  });

  it('alternates token and Perps rows deterministically', () => {
    const firstToken = createUnifiedWatchlistToken(TOKEN);
    const secondToken = createUnifiedWatchlistToken({
      ...TOKEN,
      assetId: 'eip155:1/erc20:0x1',
      symbol: 'ONE',
    });
    const perp = createUnifiedWatchlistPerp(PERP);

    const result = buildWatchlistItems([firstToken, secondToken], [perp]);

    expect(result.map((item) => item.key)).toEqual([
      firstToken.key,
      perp.key,
      secondToken.key,
    ]);
  });

  it('disables live prices for offline and low slow-cellular cells', () => {
    const offline = canUseWatchlistLivePrices('HIGH', 'NONE');
    const constrained = canUseWatchlistLivePrices('LOW', 'SLOW_CELLULAR');

    expect(offline).toBe(false);
    expect(constrained).toBe(false);
  });

  it('keeps live prices for unknown tiers', () => {
    const result = canUseWatchlistLivePrices(null, null);

    expect(result).toBe(true);
  });
});
