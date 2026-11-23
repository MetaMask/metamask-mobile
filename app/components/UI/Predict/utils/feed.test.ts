import {
  deduplicateSeriesMarkets,
  filterStandaloneMarkets,
  resolvePredictFilterLabel,
} from './feed';
import { Recurrence, type PredictMarket } from '../types';

const createMockMarket = (
  id: string,
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id,
    providerId: 'polymarket',
    slug: `market-${id}`,
    title: `Market ${id}`,
    description: 'Description',
    image: 'https://example.com/img.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: [],
    outcomes: [],
    liquidity: 100,
    volume: 200,
    ...overrides,
  }) as PredictMarket;

const createUpDownMarket = (id: string, seriesSlug: string): PredictMarket =>
  createMockMarket(id, {
    series: {
      id: `s-${seriesSlug}`,
      slug: seriesSlug,
      title: seriesSlug,
      recurrence: '5m',
    },
    tags: ['crypto', 'up-or-down'],
  });

describe('deduplicateSeriesMarkets', () => {
  it('returns empty array for empty input', () => {
    const result = deduplicateSeriesMarkets([]);

    expect(result).toEqual([]);
  });

  it('passes through non-series markets unchanged', () => {
    const marketA = createMockMarket('a');
    const marketB = createMockMarket('b');
    const marketC = createMockMarket('c');

    const result = deduplicateSeriesMarkets([marketA, marketB, marketC]);

    expect(result).toEqual([marketA, marketB, marketC]);
  });

  it('keeps first occurrence of a Crypto Up/Down series slug', () => {
    const first = createUpDownMarket('event-1', 'btc-up-or-down-5m');
    const duplicate = createUpDownMarket('event-2', 'btc-up-or-down-5m');
    const regular = createMockMarket('regular');

    const result = deduplicateSeriesMarkets([first, regular, duplicate]);

    expect(result).toEqual([first, regular]);
  });

  it('deduplicates multiple series independently', () => {
    const btc1 = createUpDownMarket('btc-1', 'btc-up-or-down-5m');
    const eth1 = createUpDownMarket('eth-1', 'eth-up-or-down-1h');
    const btc2 = createUpDownMarket('btc-2', 'btc-up-or-down-5m');
    const eth2 = createUpDownMarket('eth-2', 'eth-up-or-down-1h');

    const result = deduplicateSeriesMarkets([btc1, eth1, btc2, eth2]);

    expect(result).toEqual([btc1, eth1]);
  });

  it('preserves order of non-series markets mixed with series', () => {
    const regular1 = createMockMarket('r1');
    const btc1 = createUpDownMarket('btc-1', 'btc-up-or-down-5m');
    const regular2 = createMockMarket('r2');
    const btc2 = createUpDownMarket('btc-2', 'btc-up-or-down-5m');
    const regular3 = createMockMarket('r3');

    const result = deduplicateSeriesMarkets([
      regular1,
      btc1,
      regular2,
      btc2,
      regular3,
    ]);

    expect(result).toEqual([regular1, btc1, regular2, regular3]);
  });

  it('does not deduplicate non-Up/Down series markets', () => {
    const tweet1 = createMockMarket('tweet-1', {
      series: {
        id: 's-tweets',
        slug: 'elon-tweets',
        title: 'Elon Tweets',
        recurrence: 'monthly',
      },
      tags: ['entertainment'],
    });
    const tweet2 = createMockMarket('tweet-2', {
      series: {
        id: 's-tweets',
        slug: 'elon-tweets',
        title: 'Elon Tweets',
        recurrence: 'monthly',
      },
      tags: ['entertainment'],
    });

    const result = deduplicateSeriesMarkets([tweet1, tweet2]);

    expect(result).toEqual([tweet1, tweet2]);
  });

  it('handles single Up/Down market without removing it', () => {
    const single = createUpDownMarket('only-one', 'btc-up-or-down-5m');

    const result = deduplicateSeriesMarkets([single]);

    expect(result).toEqual([single]);
  });

  it('collapses repeated Gold and Silver 15m windows across pages while keeping unrelated markets', () => {
    const createMetalWindow = (
      id: string,
      assetTag: 'gold' | 'silver',
      seriesId: string,
      seriesSlug: string,
      endDate: string,
    ): PredictMarket =>
      createMockMarket(id, {
        endDate,
        series: {
          id: seriesId,
          slug: seriesSlug,
          title:
            assetTag === 'gold'
              ? 'Gold Up or Down 15m'
              : 'Silver Up or Down 15m',
          recurrence: '15m',
        },
        tags: [assetTag, 'up-or-down'],
      });

    const gold1 = createMetalWindow(
      'xau-1',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:15:00Z',
    );
    const gold2 = createMetalWindow(
      'xau-2',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:30:00Z',
    );
    const gold3 = createMetalWindow(
      'xau-3',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:45:00Z',
    );
    const silver1 = createMetalWindow(
      'xag-1',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:15:00Z',
    );
    const silver2 = createMetalWindow(
      'xag-2',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:30:00Z',
    );
    const silver3 = createMetalWindow(
      'xag-3',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:45:00Z',
    );
    const unrelated1 = createMockMarket('fed-rates', { tags: ['finance'] });
    const unrelated2 = createMockMarket('sp500-close', { tags: ['finance'] });

    const page1 = [gold1, unrelated1, silver1, gold2, silver2];
    const page2 = [gold3, unrelated2, silver3];

    const result = deduplicateSeriesMarkets([...page1, ...page2]);

    expect(result).toEqual([gold1, unrelated1, silver1, unrelated2]);
  });
});

describe('filterStandaloneMarkets', () => {
  it('removes markets with a parent market id', () => {
    const parent = createMockMarket('parent');
    const emptyParent = createMockMarket('empty-parent', {
      parentMarketId: '',
    });
    const nullParent = createMockMarket('null-parent', {
      parentMarketId: null,
    });
    const child = createMockMarket('child', {
      parentMarketId: 'parent',
    });
    const numericChild = createMockMarket('numeric-child', {
      parentMarketId: 123,
    });

    const result = filterStandaloneMarkets([
      parent,
      emptyParent,
      nullParent,
      child,
      numericChild,
    ]);

    expect(result).toEqual([parent, emptyParent, nullParent]);
  });
});

describe('resolvePredictFilterLabel', () => {
  it('uses translated titleKey when the translation exists', () => {
    const result = resolvePredictFilterLabel({
      id: 'games',
      titleKey: 'predict.feed.filters.games',
      label: 'Remote Games',
    });

    expect(result).toBe('Games');
  });

  it('uses trimmed label when titleKey is missing a translation', () => {
    const result = resolvePredictFilterLabel({
      id: 'remote-chip',
      titleKey: 'predict.feed.filters.remote-chip',
      label: '  Remote Chip  ',
    });

    expect(result).toBe('Remote Chip');
  });

  it('humanizes id when translation and label are missing', () => {
    const result = resolvePredictFilterLabel({
      id: 'remote_chip-id',
      titleKey: 'predict.feed.filters.remote_chip-id',
    });

    expect(result).toBe('Remote Chip Id');
  });
});
