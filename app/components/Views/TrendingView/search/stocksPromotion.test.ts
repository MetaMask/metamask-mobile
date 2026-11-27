import { act, renderHook } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { SearchFeedSection } from './useExploreSearch';
import {
  STOCKS_PROMOTION_GRACE_MS,
  normalizeStockTicker,
  orderExploreSearchSections,
  rankStockSearchResults,
  shouldPromoteStocksSection,
  stripLeadingDollarQuery,
  useStocksPromotion,
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

  it('does not promote when the exact match is beyond maxItems', () => {
    const items = [
      makeStockAsset({
        assetId: 'eip155:1/erc20:0x1',
        name: 'MACOM',
        rwaData: { ticker: 'MTSI' },
      }),
      makeStockAsset({
        assetId: 'eip155:1/erc20:0x2',
        name: 'Marvell',
        rwaData: { ticker: 'MRVL' },
      }),
      makeStockAsset({
        assetId: 'eip155:1/erc20:0x3',
        name: 'MaxLinear',
        rwaData: { ticker: 'MXL' },
      }),
      makeStockAsset({
        assetId: 'eip155:1/erc20:0x4',
        name: 'Mastercard',
        rwaData: { ticker: 'MA' },
      }),
    ];
    const section = makeSection('stocks', { items, isLoading: false });

    expect(shouldPromoteStocksSection('MA', section, 3)).toBe(false);
    expect(shouldPromoteStocksSection('MA', section, 4)).toBe(true);
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

describe('rankStockSearchResults', () => {
  it('ranks exact ticker match first, then prefix, then market cap, deprioritizing zero price', () => {
    const macom = makeStockAsset({
      assetId: 'eip155:1/erc20:0x1',
      symbol: 'MTSIon',
      name: 'MACOM Technology',
      price: '0.00',
      marketCap: 0,
      rwaData: { ticker: 'MTSI' },
    });
    const marvell = makeStockAsset({
      assetId: 'eip155:1/erc20:0x2',
      symbol: 'MRVLon',
      name: 'Marvell Technology',
      price: '80.00',
      marketCap: 70_000_000_000,
      rwaData: { ticker: 'MRVL' },
    });
    const maxLinear = makeStockAsset({
      assetId: 'eip155:1/erc20:0x3',
      symbol: 'MXLon',
      name: 'MaxLinear',
      price: '15.00',
      marketCap: 1_200_000_000,
      rwaData: { ticker: 'MXL' },
    });
    const mastercard = makeStockAsset({
      assetId: 'eip155:1/erc20:0x4',
      symbol: 'MAon',
      name: 'Mastercard (Ondo Tokenized)',
      price: '500.00',
      marketCap: 480_000_000_000,
      rwaData: { ticker: 'MA' },
    });
    const marathon = makeStockAsset({
      assetId: 'eip155:1/erc20:0x5',
      symbol: 'MARAon',
      name: 'Marathon Digital',
      price: '20.00',
      marketCap: 5_000_000_000,
      rwaData: { ticker: 'MARA' },
    });

    const ranked = rankStockSearchResults(
      [macom, maxLinear, marvell, marathon, mastercard],
      'MA',
    );

    expect(ranked.map((item) => item.rwaData?.ticker)).toEqual([
      'MA',
      'MARA',
      'MRVL',
      'MXL',
      'MTSI',
    ]);
  });

  it('ranks exact issuer-stripped name above partial name matches', () => {
    const partial = makeStockAsset({
      assetId: 'eip155:1/erc20:0x1',
      name: 'Tesla Supply Chain ETF',
      marketCap: 999_000_000_000,
      rwaData: { ticker: 'TSCE' },
    });
    const exactName = makeStockAsset({
      assetId: 'eip155:1/erc20:0x2',
      name: 'Tesla (Ondo Tokenized)',
      marketCap: 800_000_000_000,
      rwaData: { ticker: 'TSLA' },
    });

    const ranked = rankStockSearchResults([partial, exactName], 'Tesla');
    expect(ranked.map((item) => item.rwaData?.ticker)).toEqual([
      'TSLA',
      'TSCE',
    ]);
  });
});

describe('useStocksPromotion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('holds non-stocks sections while Stocks loads and promotes if Stocks resolves within grace window', () => {
    const readyTokens = makeSection('tokens', {
      items: [{ assetId: 'eip155:1/erc20:0x1' }],
      isLoading: false,
    });
    const loadingStocks = makeSection('stocks', {
      items: [],
      isLoading: true,
    });
    const loadedStocks = makeSection('stocks', {
      items: [makeStockAsset()],
      isLoading: false,
    });

    const { result, rerender } = renderHook(
      ({
        searchQuery,
        sections,
      }: {
        searchQuery: string;
        sections: SearchFeedSection[];
      }) =>
        useStocksPromotion({
          searchQuery,
          sections,
          isEnabled: true,
        }),
      {
        initialProps: {
          searchQuery: 'TSLA',
          sections: [readyTokens, loadingStocks],
        },
      },
    );

    expect(result.current.shouldHoldForStocks).toBe(true);
    expect(result.current.isStocksPromoted).toBe(false);

    act(() => {
      jest.advanceTimersByTime(STOCKS_PROMOTION_GRACE_MS - 50);
    });
    expect(result.current.shouldHoldForStocks).toBe(true);

    rerender({ searchQuery: 'TSLA', sections: [readyTokens, loadedStocks] });
    expect(result.current.shouldHoldForStocks).toBe(false);
    expect(result.current.isStocksPromoted).toBe(true);
  });

  it('locks promotion off after grace window expires so late Stocks does not jump', () => {
    const readyTokens = makeSection('tokens', {
      items: [{ assetId: 'eip155:1/erc20:0x1' }],
      isLoading: false,
    });
    const loadingStocks = makeSection('stocks', {
      items: [],
      isLoading: true,
    });
    const loadedStocks = makeSection('stocks', {
      items: [makeStockAsset()],
      isLoading: false,
    });

    const { result, rerender } = renderHook(
      ({
        searchQuery,
        sections,
      }: {
        searchQuery: string;
        sections: SearchFeedSection[];
      }) =>
        useStocksPromotion({
          searchQuery,
          sections,
          isEnabled: true,
        }),
      {
        initialProps: {
          searchQuery: 'TSLA',
          sections: [readyTokens, loadingStocks],
        },
      },
    );

    act(() => {
      jest.advanceTimersByTime(STOCKS_PROMOTION_GRACE_MS);
    });

    expect(result.current.shouldHoldForStocks).toBe(false);
    expect(result.current.isStocksPromoted).toBe(false);

    // Late Stocks response arrives 2s later — must remain locked off.
    rerender({ searchQuery: 'TSLA', sections: [readyTokens, loadedStocks] });
    expect(result.current.isStocksPromoted).toBe(false);

    // Changing query resets the lock.
    rerender({ searchQuery: 'TSL', sections: [readyTokens, loadingStocks] });
    rerender({ searchQuery: 'TSLA', sections: [readyTokens, loadedStocks] });
    expect(result.current.isStocksPromoted).toBe(true);
  });

  it('does not start the grace timer while all non-stocks sections are still loading', () => {
    const loadingTokens = makeSection('tokens', { items: [], isLoading: true });
    const loadingStocks = makeSection('stocks', { items: [], isLoading: true });
    const loadedStocks = makeSection('stocks', {
      items: [makeStockAsset()],
      isLoading: false,
    });

    const { result, rerender } = renderHook(
      ({ sections }: { sections: SearchFeedSection[] }) =>
        useStocksPromotion({
          searchQuery: 'TSLA',
          sections,
          isEnabled: true,
        }),
      { initialProps: { sections: [loadingTokens, loadingStocks] } },
    );

    act(() => {
      jest.advanceTimersByTime(STOCKS_PROMOTION_GRACE_MS * 3);
    });
    expect(result.current.shouldHoldForStocks).toBe(true);

    rerender({ sections: [loadingTokens, loadedStocks] });
    expect(result.current.isStocksPromoted).toBe(true);
  });
});
