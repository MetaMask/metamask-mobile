import { isCryptoUpDown, UP_OR_DOWN_TAG } from './cryptoUpDown';
import { Recurrence, type PredictMarket } from '../types';

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'market-1',
    title: 'Market 1',
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

describe('cryptoUpDown utilities', () => {
  describe('UP_OR_DOWN_TAG', () => {
    it('equals "up-or-down"', () => {
      expect(UP_OR_DOWN_TAG).toBe('up-or-down');
    });
  });

  describe('isCryptoUpDown', () => {
    it('returns true when market has series and up-or-down tag', () => {
      const market = createMockMarket({
        series: {
          id: 's1',
          slug: 'btc-up-or-down-5m',
          title: 'BTC Up or Down',
          recurrence: '5m',
        },
        tags: ['crypto', 'up-or-down'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(true);
    });

    it('returns false when market has series but no up-or-down tag', () => {
      const market = createMockMarket({
        series: {
          id: 's1',
          slug: 'elon-tweets-monthly',
          title: 'Elon Tweets',
          recurrence: 'monthly',
        },
        tags: ['crypto', 'entertainment'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(false);
    });

    it('returns false when market has up-or-down tag but no series', () => {
      const market = createMockMarket({
        series: undefined,
        tags: ['crypto', 'up-or-down'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(false);
    });

    it('returns false when market has neither series nor up-or-down tag', () => {
      const market = createMockMarket({
        series: undefined,
        tags: ['politics'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(false);
    });

    it('returns false when market has empty tags array and series', () => {
      const market = createMockMarket({
        series: {
          id: 's1',
          slug: 'btc-up-or-down-5m',
          title: 'BTC',
          recurrence: '5m',
        },
        tags: [],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(false);
    });

    it('returns true when up-or-down tag is among many tags', () => {
      const market = createMockMarket({
        series: {
          id: 's1',
          slug: 'eth-up-or-down-1h',
          title: 'ETH Up or Down',
          recurrence: '1h',
        },
        tags: ['crypto', 'trending', 'up-or-down', 'featured'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(true);
    });
  });
});
