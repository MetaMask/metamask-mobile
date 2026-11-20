import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  buildHomepageWatchlistItems,
  canUseWatchlistGlass,
  canUseWatchlistLivePrices,
  canUseWatchlistMotion,
  createUnifiedWatchlistPerp,
  createUnifiedWatchlistToken,
  getPerpsWatchlistKey,
  getWatchlistPerpsPollingInterval,
  getTokenWatchlistKey,
  filterWatchlistItems,
  prioritizeSuggestedWatchlistPerps,
  reconcileWatchlistOrder,
  reorderWatchlistItems,
  selectWatchlistSuggestions,
  shouldSkipWatchlistOptionalFetch,
  shouldSkipWatchlistRemoteFetch,
} from './utils';

const createToken = (assetId: string, name: string): TrendingAsset =>
  ({
    assetId,
    name,
    symbol: name,
    decimals: 18,
    price: '1',
  }) as TrendingAsset;

const createMarket = (
  symbol: string,
  id: string,
  providerId: 'hyperliquid' = 'hyperliquid',
): PerpsMarketData =>
  ({
    id,
    symbol,
    providerId,
    name: symbol,
    maxLeverage: '10x',
    price: '$1',
    change24h: '$0',
    change24hPercent: '0%',
    volume: '$1M',
  }) as PerpsMarketData;

describe('watchlist view-model utilities', () => {
  it('namespaces token and Perps identities independently', () => {
    const tokenId = 'eip155:1/erc20:0xABC';
    const market = createMarket('ETH', 'eth-hyperliquid-mainnet');

    expect(getTokenWatchlistKey(tokenId)).toBe('token:eip155:1/erc20:0xabc');
    expect(getPerpsWatchlistKey(market)).toBe('perp:eth');
    expect(
      createUnifiedWatchlistToken(createToken(tokenId, 'Ethereum')).kind,
    ).toBe('token');
    expect(createUnifiedWatchlistPerp(market).kind).toBe('perp');
  });

  it('preserves case-sensitive non-EVM token identities', () => {
    const solanaAssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
    const differentCaseAssetId =
      'solana:5eykt4usfv8p8njdtrepy1vzqkqzkvdp/slip44:501';

    expect(getTokenWatchlistKey(solanaAssetId)).toBe(`token:${solanaAssetId}`);
    expect(getTokenWatchlistKey(solanaAssetId)).not.toBe(
      getTokenWatchlistKey(differentCaseAssetId),
    );
  });

  it('keeps same-ticker token and Perps rows distinct', () => {
    const token = createUnifiedWatchlistToken(
      createToken('eip155:1/slip44:60', 'Ethereum'),
    );
    const perp = createUnifiedWatchlistPerp(
      createMarket('ETH', 'eth-hyperliquid-mainnet'),
    );

    expect(token.key).not.toBe(perp.key);
    expect(buildHomepageWatchlistItems([token, perp], 5)).toEqual([
      token,
      perp,
    ]);
  });

  it('prioritizes non-crypto Perps and removes token duplicates', () => {
    const markets = [
      { ...createMarket('BTC', 'btc'), isHip3: false },
      { ...createMarket('xyz:TSLA', 'tsla'), isHip3: true },
      { ...createMarket('xyz:ETH', 'eth'), isHip3: true },
      { ...createMarket('SOL', 'sol'), isHip3: false },
    ];

    expect(prioritizeSuggestedWatchlistPerps(markets, ['ETH', 'TSLA'])).toEqual(
      [markets[0], markets[3]],
    );
    expect(prioritizeSuggestedWatchlistPerps(markets, ['ETH'])).toEqual([
      markets[1],
      markets[0],
      markets[3],
    ]);
  });

  it('reserves the first five suggestion slots for two tokens and three Perps', () => {
    const tokens = ['A', 'B', 'C', 'D', 'E'].map((symbol) => ({
      ...createToken(`token:${symbol}`, symbol),
      balance: '0',
      isInWallet: false,
    }));
    const perps = ['X', 'Y', 'Z'].map((symbol) =>
      createMarket(symbol, `perp-${symbol}`),
    );

    const result = selectWatchlistSuggestions(tokens, perps, 10);

    expect(
      result.map((row) =>
        row.kind === 'token'
          ? `token:${row.token.symbol}`
          : `perp:${row.market.symbol}`,
      ),
    ).toEqual([
      'token:A',
      'token:B',
      'perp:X',
      'perp:Y',
      'perp:Z',
      'token:C',
      'token:D',
      'token:E',
    ]);
  });

  it('deduplicates token and Perps suggestions with the same ticker', () => {
    const tokens = ['AAA', 'BBB', 'ETH'].map((symbol) => ({
      ...createToken(`token:${symbol}`, symbol),
      balance: '0',
      isInWallet: false,
    }));
    const perps = [createMarket('ETH', 'perp-ETH')];

    const result = selectWatchlistSuggestions(tokens, perps, 5);

    expect(
      result.map((row) =>
        row.kind === 'token'
          ? `token:${row.token.symbol}`
          : `perp:${row.market.symbol}`,
      ),
    ).toEqual(['token:AAA', 'token:BBB', 'perp:ETH']);
  });

  it('keeps the All list flat and filters by domain', () => {
    const token = createUnifiedWatchlistToken(
      createToken('eip155:1/slip44:60', 'Ethereum'),
    );
    const perp = createUnifiedWatchlistPerp(
      createMarket('ETH', 'eth-hyperliquid-mainnet'),
    );

    expect(filterWatchlistItems([token, perp], 'all')).toEqual([token, perp]);
    expect(filterWatchlistItems([token, perp], 'tokens')).toEqual([token]);
    expect(filterWatchlistItems([token, perp], 'perps')).toEqual([perp]);
  });

  it('reconciles persisted order with newly watched and removed items', () => {
    const token = createUnifiedWatchlistToken(
      createToken('eip155:1/slip44:60', 'Ethereum'),
    );
    const perp = createUnifiedWatchlistPerp(
      createMarket('ETH', 'eth-hyperliquid-mainnet'),
    );
    const addedToken = createUnifiedWatchlistToken(
      createToken('eip155:1/erc20:0xABC', 'Wrapped Ether'),
    );

    expect(
      reconcileWatchlistOrder(
        ['unknown', perp.key, perp.key],
        [token, perp, addedToken],
      ),
    ).toEqual([perp.key, token.key, addedToken.key]);
  });

  it('migrates legacy provider-qualified Perps keys without changing order', () => {
    const token = createUnifiedWatchlistToken(
      createToken('eip155:1/slip44:60', 'Ethereum'),
    );
    const perp = createUnifiedWatchlistPerp(
      createMarket('ETH', 'hyperliquid:ETH'),
    );

    expect(
      reconcileWatchlistOrder(
        ['perp:hyperliquid:eth', token.key],
        [token, perp],
      ),
    ).toEqual([perp.key, token.key]);
  });

  it.each([
    ['ETH', 'WETH'],
    ['BTC', 'WBTC'],
  ])(
    'does not migrate a legacy %s segment to the %s market',
    (shortSymbol, wrappedSymbol) => {
      const shortMarket = createUnifiedWatchlistPerp(
        createMarket(shortSymbol, `hyperliquid:${shortSymbol}`),
      );
      const wrappedMarket = createUnifiedWatchlistPerp(
        createMarket(wrappedSymbol, `hyperliquid:${wrappedSymbol}`),
      );

      expect(
        reconcileWatchlistOrder(
          [`perp:hyperliquid:${wrappedSymbol.toLowerCase()}`],
          [shortMarket, wrappedMarket],
        ),
      ).toEqual([wrappedMarket.key, shortMarket.key]);
    },
  );

  it('reorders mixed token and Perps rows by list index', () => {
    const token = createUnifiedWatchlistToken(
      createToken('eip155:1/slip44:60', 'Ethereum'),
    );
    const perp = createUnifiedWatchlistPerp(
      createMarket('ETH', 'eth-hyperliquid-mainnet'),
    );

    expect(reorderWatchlistItems([token, perp], 0, 1)).toEqual([perp, token]);
  });

  it('applies the device and network capability policy independently', () => {
    expect(shouldSkipWatchlistRemoteFetch('LOW', 'SLOW_CELLULAR')).toBe(false);
    expect(shouldSkipWatchlistRemoteFetch('HIGH', 'SLOW_CELLULAR')).toBe(false);
    expect(shouldSkipWatchlistRemoteFetch(null, 'NONE')).toBe(true);
    expect(shouldSkipWatchlistOptionalFetch('LOW', 'SLOW_CELLULAR')).toBe(true);
    expect(shouldSkipWatchlistOptionalFetch('LOW', 'WIFI')).toBe(true);
    expect(shouldSkipWatchlistOptionalFetch('HIGH', 'SLOW_CELLULAR')).toBe(
      false,
    );
    expect(shouldSkipWatchlistOptionalFetch(null, 'NONE')).toBe(true);
    expect(canUseWatchlistLivePrices('LOW', 'SLOW_CELLULAR')).toBe(false);
    expect(canUseWatchlistLivePrices('MID', null)).toBe(true);
    expect(canUseWatchlistMotion('LOW', 'SLOW_CELLULAR')).toBe(false);
    expect(canUseWatchlistMotion('HIGH', 'WIFI')).toBe(true);
    expect(canUseWatchlistGlass('NONE')).toBe(false);
    expect(canUseWatchlistGlass(null)).toBe(true);
    expect(getWatchlistPerpsPollingInterval('LOW', 'NONE')).toBeNull();
    expect(getWatchlistPerpsPollingInterval('LOW', 'SLOW_CELLULAR')).toBe(5000);
    expect(getWatchlistPerpsPollingInterval(null, null)).toBe(100);
  });
});
