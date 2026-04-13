import {
  isCryptoUpDown,
  UP_OR_DOWN_TAG,
  CRYPTO_TAG,
  getCryptoSymbol,
  getVariant,
  getEventStartTime,
  RECURRENCE_TO_DURATION_SECS,
} from './cryptoUpDown';
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

  describe('CRYPTO_TAG', () => {
    it('equals "crypto"', () => {
      expect(CRYPTO_TAG).toBe('crypto');
    });
  });

  describe('isCryptoUpDown', () => {
    it('returns true when market has series, up-or-down tag, and crypto tag', () => {
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

    it('returns false when market has series and up-or-down tag but no crypto tag', () => {
      const market = createMockMarket({
        series: {
          id: 's1',
          slug: 'btc-up-or-down-5m',
          title: 'BTC Up or Down',
          recurrence: '5m',
        },
        tags: ['up-or-down', 'trending'],
      });

      const result = isCryptoUpDown(market);

      expect(result).toBe(false);
    });
  });

  describe('getCryptoSymbol', () => {
    it('returns BTC when market has bitcoin tag', () => {
      const market = createMockMarket({
        tags: ['bitcoin', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('BTC');
    });

    it('returns ETH when market has ethereum tag', () => {
      const market = createMockMarket({
        tags: ['ethereum', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('ETH');
    });

    it('returns SOL when market has solana tag', () => {
      const market = createMockMarket({
        tags: ['solana', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('SOL');
    });

    it('returns XRP when market has xrp tag', () => {
      const market = createMockMarket({
        tags: ['xrp', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('XRP');
    });

    it('returns DOGE when market has dogecoin tag', () => {
      const market = createMockMarket({
        tags: ['dogecoin', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('DOGE');
    });

    it('returns BNB when market has bnb tag', () => {
      const market = createMockMarket({
        tags: ['bnb', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('BNB');
    });

    it('returns HYPE when market has hype tag', () => {
      const market = createMockMarket({
        tags: ['hype', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('HYPE');
    });

    it('returns symbol from slug when no matching tag', () => {
      const market = createMockMarket({
        slug: 'btc-up-or-down-5m',
        tags: ['crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('BTC');
    });

    it('returns undefined when no matching tag and empty slug', () => {
      const market = createMockMarket({
        slug: '',
        tags: ['crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBeUndefined();
    });

    it('returns symbol from tag when market has multiple tags including crypto tag', () => {
      const market = createMockMarket({
        slug: 'eth-up-or-down-1h',
        tags: ['trending', 'ethereum', 'featured', 'crypto'],
      });

      const result = getCryptoSymbol(market);

      expect(result).toBe('ETH');
    });
  });

  describe('getVariant', () => {
    it('converts 5m to fiveminute', () => {
      const result = getVariant('5m');

      expect(result).toBe('fiveminute');
    });

    it('converts 15m to fifteen', () => {
      const result = getVariant('15m');

      expect(result).toBe('fifteen');
    });

    it('converts 1h to hourly', () => {
      const result = getVariant('1h');

      expect(result).toBe('hourly');
    });

    it('converts 4h to fourhour', () => {
      const result = getVariant('4h');

      expect(result).toBe('fourhour');
    });

    it('converts daily to daily', () => {
      const result = getVariant('daily');

      expect(result).toBe('daily');
    });

    it('returns hourly for unknown recurrence', () => {
      const result = getVariant('unknown');

      expect(result).toBe('hourly');
    });

    it('returns hourly for empty string', () => {
      const result = getVariant('');

      expect(result).toBe('hourly');
    });
  });

  describe('getEventStartTime', () => {
    it('computes start time for 5m recurrence', () => {
      const endDate = '2024-01-01T12:05:00.000Z';

      const result = getEventStartTime(endDate, '5m');

      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('computes start time for 15m recurrence', () => {
      const endDate = '2024-01-01T12:15:00.000Z';

      const result = getEventStartTime(endDate, '15m');

      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('computes start time for 1h recurrence', () => {
      const endDate = '2024-01-01T13:00:00.000Z';

      const result = getEventStartTime(endDate, '1h');

      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('computes start time for 4h recurrence', () => {
      const endDate = '2024-01-01T16:00:00.000Z';

      const result = getEventStartTime(endDate, '4h');

      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('computes start time for daily recurrence', () => {
      const endDate = '2024-01-02T00:00:00.000Z';

      const result = getEventStartTime(endDate, 'daily');

      expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns undefined when endDate is undefined', () => {
      const result = getEventStartTime(undefined, '5m');

      expect(result).toBeUndefined();
    });

    it('returns undefined when endDate is invalid', () => {
      const result = getEventStartTime('invalid-date', '5m');

      expect(result).toBeUndefined();
    });

    it('returns undefined when recurrence is unknown', () => {
      const endDate = '2024-01-01T12:05:00.000Z';

      const result = getEventStartTime(endDate, 'unknown');

      expect(result).toBeUndefined();
    });
  });

  describe('RECURRENCE_TO_DURATION_SECS', () => {
    it('has 5m duration of 300 seconds', () => {
      expect(RECURRENCE_TO_DURATION_SECS['5m']).toBe(300);
    });

    it('has 15m duration of 900 seconds', () => {
      expect(RECURRENCE_TO_DURATION_SECS['15m']).toBe(900);
    });

    it('has 1h duration of 3600 seconds', () => {
      expect(RECURRENCE_TO_DURATION_SECS['1h']).toBe(3600);
    });

    it('has 4h duration of 14400 seconds', () => {
      expect(RECURRENCE_TO_DURATION_SECS['4h']).toBe(14400);
    });

    it('has daily duration of 86400 seconds', () => {
      expect(RECURRENCE_TO_DURATION_SECS.daily).toBe(86400);
    });
  });
});
