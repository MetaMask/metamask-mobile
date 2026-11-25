import type { TrendingAsset } from '@metamask/assets-controllers';
import type { SearchFeedSection } from './useExploreSearch';
import {
  normalizeStockTicker,
  orderExploreSearchSections,
  shouldPromoteStocksSection,
  stripLeadingDollarQuery,
} from './stocksPromotion';

const makeStockAsset = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset =>
  ({
    assetId: 'eip155:1/erc20:0xtsla',
    symbol: 'TSLAon',
    name: 'Tesla (Ondo Tokenized)',
    decimals: 18,
    price: '250.00',
    rwaData: {
      ticker: 'TSLA',
      instrumentType: 'equity',
    },
    ...overrides,
  }) as unknown as TrendingAsset;

const makeSection = (
  feedId: SearchFeedSection['feedId'],
  overrides: Partial<SearchFeedSection> = {},
): SearchFeedSection => ({
  feedId,
  title: feedId,
  items: [],
  isLoading: false,
  ...overrides,
});

describe('normalizeStockTicker', () => {
  it.each([
    ['TSLA', 'tsla'],
    ['tsla', 'tsla'],
    ['$TSLA', 'tsla'],
    ['  $tsla  ', 'tsla'],
    ['$ TSLA', 'tsla'],
    ['BRK B', 'brkb'],
    ['   ', ''],
    ['$', ''],
    ['', ''],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeStockTicker(input)).toBe(expected);
  });

  it('strips only a single leading dollar sign', () => {
    expect(normalizeStockTicker('$$TSLA')).toBe('$tsla');
  });
});

describe('stripLeadingDollarQuery', () => {
  it.each([
    ['$TSLA', 'TSLA'],
    ['  $TSLA  ', 'TSLA'],
    ['$ tsla', 'tsla'],
    ['TSLA', 'TSLA'],
    ['  OUSG  ', 'OUSG'],
    ['$', ''],
    ['   ', ''],
    ['', ''],
    [undefined, ''],
  ])('strips %p to %p', (input, expected) => {
    expect(stripLeadingDollarQuery(input)).toBe(expected);
  });
});

describe('shouldPromoteStocksSection', () => {
  const loadedStocks = makeSection('stocks', {
    items: [makeStockAsset()],
    isLoading: false,
  });

  it.each(['TSLA', 'tsla', '$TSLA', '  $tsla  ', '$ TSLA', 'TsLa'])(
    'returns true for exact ticker match query %p',
    (query) => {
      expect(shouldPromoteStocksSection(query, loadedStocks)).toBe(true);
    },
  );

  it.each(['Tesla', 'tesla', '  TESLA  ', 'Tesla (Ondo Tokenized)'])(
    'returns true for exact name match query %p',
    (query) => {
      expect(shouldPromoteStocksSection(query, loadedStocks)).toBe(true);
    },
  );

  it('matches exact company name for xStock and plain-named RWAs', () => {
    const microsoftStocks = makeSection('stocks', {
      items: [
        makeStockAsset({
          assetId: 'eip155:1/erc20:0xmsft',
          symbol: 'MSFTx',
          name: 'Microsoft xStock',
          rwaData: { ticker: 'MSFT' },
        }),
        makeStockAsset({
          assetId: 'eip155:1/erc20:0xaapl',
          symbol: 'AAPL',
          name: 'Apple',
          rwaData: { ticker: 'AAPL' },
        }),
      ],
      isLoading: false,
    });

    expect(shouldPromoteStocksSection('Microsoft', microsoftStocks)).toBe(true);
    expect(shouldPromoteStocksSection('microsoft', microsoftStocks)).toBe(true);
    expect(shouldPromoteStocksSection('Apple', microsoftStocks)).toBe(true);
    expect(shouldPromoteStocksSection('Micro', microsoftStocks)).toBe(false);
    expect(shouldPromoteStocksSection('App', microsoftStocks)).toBe(false);
  });

  it.each(['TSL', 'tesl', 'eth', '', '   ', '$', '$$TSLA'])(
    'returns false for non-matching query %p',
    (query) => {
      expect(shouldPromoteStocksSection(query, loadedStocks)).toBe(false);
    },
  );

  it('returns false while Stocks is loading', () => {
    const loadingStocks = makeSection('stocks', {
      items: [makeStockAsset()],
      isLoading: true,
    });

    expect(shouldPromoteStocksSection('TSLA', loadingStocks)).toBe(false);
  });

  it('returns false when Stocks has no results', () => {
    const emptyStocks = makeSection('stocks', {
      items: [],
      isLoading: false,
    });

    expect(shouldPromoteStocksSection('TSLA', emptyStocks)).toBe(false);
  });

  it('returns false when Stocks section is missing', () => {
    expect(shouldPromoteStocksSection('TSLA', undefined)).toBe(false);
  });

  it('returns false when symbol matches but item has no rwaData', () => {
    const noRwaStocks = makeSection('stocks', {
      items: [
        makeStockAsset({
          symbol: 'TSLA',
          rwaData: undefined,
        }),
      ],
      isLoading: false,
    });

    expect(shouldPromoteStocksSection('TSLA', noRwaStocks)).toBe(false);
  });

  it('returns false when rwaData exists without ticker and name does not match', () => {
    const noTickerStocks = makeSection('stocks', {
      items: [
        makeStockAsset({
          symbol: 'TSLA',
          rwaData: {},
        }),
      ],
      isLoading: false,
    });

    expect(shouldPromoteStocksSection('TSLA', noTickerStocks)).toBe(false);
  });

  it('matches when any stock item in the section has a matching rwaData.ticker', () => {
    const multiStocks = makeSection('stocks', {
      items: [
        makeStockAsset({
          assetId: 'eip155:1/erc20:0xaapl',
          symbol: 'AAPLon',
          rwaData: { ticker: 'AAPL' },
        }),
        makeStockAsset({
          assetId: 'eip155:1/erc20:0xtsla',
          symbol: 'TSLAon',
          rwaData: { ticker: 'TSLA' },
        }),
      ],
      isLoading: false,
    });

    expect(shouldPromoteStocksSection('TSLA', multiStocks)).toBe(true);
  });
});

describe('orderExploreSearchSections', () => {
  const sections: SearchFeedSection[] = [
    makeSection('tokens'),
    makeSection('perps'),
    makeSection('earn'),
    makeSection('stocks', { items: [makeStockAsset()] }),
    makeSection('predictions'),
    makeSection('sites'),
  ];

  it('moves stocks to index 0 while keeping relative order of other sections', () => {
    const ordered = orderExploreSearchSections(sections, true);

    expect(ordered.map((s) => s.feedId)).toEqual([
      'stocks',
      'tokens',
      'perps',
      'earn',
      'predictions',
      'sites',
    ]);
  });

  it('returns the original array reference when shouldPromote is false', () => {
    expect(orderExploreSearchSections(sections, false)).toBe(sections);
  });

  it('returns the original array reference when stocks is missing or already first', () => {
    const withoutStocks = sections.filter((s) => s.feedId !== 'stocks');
    expect(orderExploreSearchSections(withoutStocks, true)).toBe(withoutStocks);

    const stocksFirst = [sections[3], sections[0]];
    expect(orderExploreSearchSections(stocksFirst, true)).toBe(stocksFirst);
  });
});
