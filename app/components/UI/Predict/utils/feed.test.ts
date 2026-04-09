import { deduplicateSeriesMarkets } from './feed';
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
});
