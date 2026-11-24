import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { WatchlistTokenWithBalance } from '../Assets/watchlist/utils/addBalanceToTokens';
import {
  buildWatchlistItems,
  canUseWatchlistLivePrices,
  createUnifiedWatchlistPerp,
  createUnifiedWatchlistToken,
  reconcileWatchlistItemOrder,
  selectWatchlistSuggestions,
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

const createSuggestedToken = (symbol: string): WatchlistTokenWithBalance => ({
  assetId: `eip155:1/erc20:${symbol}`,
  symbol,
  name: symbol,
  decimals: 18,
  balance: '0',
  isInWallet: false,
});

const createSuggestedPerp = (symbol: string): PerpsMarketData => ({
  ...PERP,
  symbol,
  name: `${symbol} Perpetual`,
});

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

  it('appends newly watched rows after the existing unified order', () => {
    const bitcoin = createUnifiedWatchlistToken({
      ...TOKEN,
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      symbol: 'BTC',
    });
    const ether = createUnifiedWatchlistToken(TOKEN);

    expect(
      reconcileWatchlistItemOrder([bitcoin.key], [ether, bitcoin]),
    ).toEqual([bitcoin.key, ether.key]);
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

  it('orders two token suggestions before three Perps suggestions', () => {
    const tokens = ['BTC', 'SOL', 'ADA'].map(createSuggestedToken);
    const perps = ['ETH', 'XRP', 'DOGE', 'AVAX'].map(createSuggestedPerp);

    const result = selectWatchlistSuggestions(tokens, perps, { limit: 5 });

    expect(
      result.map((row) =>
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      ),
    ).toEqual(['BTC', 'SOL', 'ETH', 'XRP', 'DOGE']);
  });

  it('removes a Perps suggestion that duplicates a token ticker', () => {
    const tokens = [createSuggestedToken('ETH'), createSuggestedToken('SOL')];
    const perps = [
      createSuggestedPerp('ETH'),
      createSuggestedPerp('XRP'),
      createSuggestedPerp('DOGE'),
    ];

    const result = selectWatchlistSuggestions(tokens, perps, { limit: 5 });

    expect(
      result.map((row) =>
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      ),
    ).toEqual(['ETH', 'SOL', 'XRP', 'DOGE']);
  });

  it('does not suggest a Perps market for a token already on the watchlist', () => {
    const tokens = [createSuggestedToken('SOL')];
    const perps = ['BTC', 'ETH', 'XRP', 'DOGE'].map(createSuggestedPerp);

    const result = selectWatchlistSuggestions(tokens, perps, {
      limit: 5,
      watchlistedTokenSymbols: ['BTC'],
    });

    expect(
      result.map((row) =>
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      ),
    ).toEqual(['SOL', 'ETH', 'XRP', 'DOGE']);
  });

  it('does not suggest a token matching a watched Perps market', () => {
    const tokens = [createSuggestedToken('ETH'), createSuggestedToken('SOL')];
    const perps = ['XRP', 'DOGE', 'AVAX'].map(createSuggestedPerp);

    const result = selectWatchlistSuggestions(tokens, perps, {
      limit: 4,
      watchlistedPerpSymbols: ['ETH'],
    });

    expect(
      result.map((row) =>
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      ),
    ).toEqual(['SOL', 'XRP', 'DOGE', 'AVAX']);
  });

  it('fills remaining capacity without subtracting watched tokens twice', () => {
    const tokens = ['BTC', 'SOL', 'ADA'].map(createSuggestedToken);
    const perps = ['ETH', 'XRP', 'DOGE'].map(createSuggestedPerp);

    const result = selectWatchlistSuggestions(tokens, perps, {
      limit: 3,
      watchlistedTokenAssetIds: [
        String(tokens[0].assetId),
        String(tokens[1].assetId),
      ],
    });

    expect(
      result.map((row) =>
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      ),
    ).toEqual(['ADA', 'ETH', 'XRP']);
  });
});
