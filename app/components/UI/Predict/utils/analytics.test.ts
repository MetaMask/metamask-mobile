import { parseAnalyticsProperties } from './analytics';
import {
  Recurrence,
  type PredictMarket,
  type PredictOutcomeToken,
} from '../types';
import type { PredictEntryPoint } from '../types/navigation';

jest.mock('../constants/eventNames', () => ({
  PredictEventValues: {
    ENTRY_POINT: {
      PREDICT_FEED: 'predict_feed',
    },
    TRANSACTION_TYPE: {
      MM_PREDICT_BUY: 'mm_predict_buy',
    },
    MARKET_TYPE: {
      BINARY: 'binary',
      MULTI_OUTCOME: 'multi-outcome',
    },
  },
}));

describe('parseAnalyticsProperties', () => {
  const createMockMarket = (
    overrides?: Partial<PredictMarket>,
  ): PredictMarket => ({
    id: 'market-123',
    title: 'Test Market',
    category: 'sports',
    tags: ['tag1', 'tag2'],
    liquidity: 1000,
    volume: 5000,
    slug: 'test-market',
    providerId: 'provider-1',
    description: 'Test market description',
    image: 'https://example.com/market.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    outcomes: [
      {
        id: 'outcome-1',
        title: 'Yes',
        image: 'image-url',
        tokens: [],
        groupItemTitle: '',
        providerId: 'provider-1',
        marketId: 'market-123',
        description: '',
        status: 'open',
        volume: 0,
      },
    ],
    game: {
      id: 'game-123',
      startTime: '2024-01-01T00:00:00Z',
      league: 'nfl',
      status: 'ongoing',
      period: '2',
      elapsed: '10:30',
      endTime: undefined,
      score: null,
      homeTeam: {
        id: 'team-1',
        name: 'Home Team',
        logo: 'https://example.com/home.png',
        abbreviation: 'HT',
        color: 'color-default',
        alias: 'Home',
      },
      awayTeam: {
        id: 'team-2',
        name: 'Away Team',
        logo: 'https://example.com/away.png',
        abbreviation: 'AT',
        color: 'color-inverse',
        alias: 'Away',
      },
    },
    ...overrides,
  });

  const createMockOutcomeToken = (
    overrides?: Partial<PredictOutcomeToken>,
  ): PredictOutcomeToken => ({
    id: 'token-123',
    title: 'Yes',
    price: 0.65,
    ...overrides,
  });

  describe('with all fields populated', () => {
    it('returns all properties from market, outcome token, and entry point', () => {
      const market = createMockMarket();
      const outcomeToken = createMockOutcomeToken();
      const entryPoint: PredictEntryPoint = 'predict_market_details';

      const result = parseAnalyticsProperties(market, outcomeToken, entryPoint);

      expect(result).toEqual({
        marketId: 'market-123',
        marketTitle: 'Test Market',
        marketCategory: 'sports',
        marketTags: ['tag1', 'tag2'],
        entryPoint: 'predict_market_details',
        transactionType: 'mm_predict_buy',
        liquidity: 1000,
        volume: 5000,
        sharePrice: 0.65,
        marketType: 'binary',
        outcome: 'yes',
        marketSlug: 'test-market',
        gameId: 'game-123',
        gameStartTime: '2024-01-01T00:00:00Z',
        gameLeague: 'nfl',
        gameStatus: 'ongoing',
        gamePeriod: '2',
        gameClock: '10:30',
      });
    });
  });

  describe('with undefined market', () => {
    it('returns undefined for market-related properties', () => {
      const outcomeToken = createMockOutcomeToken();
      const entryPoint: PredictEntryPoint = 'predict_feed';

      const result = parseAnalyticsProperties(
        undefined,
        outcomeToken,
        entryPoint,
      );

      expect(result.marketId).toBeUndefined();
      expect(result.marketTitle).toBeUndefined();
      expect(result.marketCategory).toBeUndefined();
      expect(result.marketTags).toBeUndefined();
      expect(result.liquidity).toBeUndefined();
      expect(result.volume).toBeUndefined();
      expect(result.marketSlug).toBeUndefined();
      expect(result.gameId).toBeUndefined();
      expect(result.gameStartTime).toBeUndefined();
      expect(result.gameLeague).toBeUndefined();
      expect(result.gameStatus).toBeUndefined();
      expect(result.gamePeriod).toBeUndefined();
      expect(result.gameClock).toBeUndefined();
    });

    it('still returns transaction type and outcome token properties', () => {
      const outcomeToken = createMockOutcomeToken();
      const entryPoint: PredictEntryPoint = 'predict_feed';

      const result = parseAnalyticsProperties(
        undefined,
        outcomeToken,
        entryPoint,
      );

      expect(result.transactionType).toBe('mm_predict_buy');
      expect(result.sharePrice).toBe(0.65);
      expect(result.outcome).toBe('yes');
    });
  });

  describe('with undefined outcome token', () => {
    it('returns undefined for outcome token properties', () => {
      const market = createMockMarket();
      const entryPoint: PredictEntryPoint = 'predict_feed';

      const result = parseAnalyticsProperties(market, undefined, entryPoint);

      expect(result.sharePrice).toBeUndefined();
      expect(result.outcome).toBeUndefined();
    });

    it('still returns market properties', () => {
      const market = createMockMarket();
      const entryPoint: PredictEntryPoint = 'predict_feed';

      const result = parseAnalyticsProperties(market, undefined, entryPoint);

      expect(result.marketId).toBe('market-123');
      expect(result.marketTitle).toBe('Test Market');
      expect(result.marketType).toBe('binary');
    });
  });

  describe('with undefined entry point', () => {
    it('defaults to PREDICT_FEED entry point', () => {
      const market = createMockMarket();
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(market, outcomeToken, undefined);

      expect(result.entryPoint).toBe('predict_feed');
    });
  });

  describe('market type detection', () => {
    it('returns BINARY type when market has single outcome', () => {
      const market = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            image: 'image-url',
            tokens: [],
            groupItemTitle: '',
            providerId: 'provider-1',
            marketId: 'market-123',
            description: '',
            status: 'open',
            volume: 0,
          },
        ],
      });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.marketType).toBe('binary');
    });

    it('returns MULTI_OUTCOME type when market has multiple outcomes', () => {
      const market = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            image: 'image-url',
            tokens: [],
            groupItemTitle: '',
            providerId: 'provider-1',
            marketId: 'market-123',
            description: '',
            status: 'open',
            volume: 0,
          },
          {
            id: 'outcome-2',
            title: 'No',
            image: 'image-url',
            tokens: [],
            groupItemTitle: '',
            providerId: 'provider-1',
            marketId: 'market-123',
            description: '',
            status: 'open',
            volume: 0,
          },
          {
            id: 'outcome-3',
            title: 'Maybe',
            image: 'image-url',
            tokens: [],
            groupItemTitle: '',
            providerId: 'provider-1',
            marketId: 'market-123',
            description: '',
            status: 'open',
            volume: 0,
          },
        ],
      });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.marketType).toBe('multi-outcome');
    });
  });

  describe('outcome title case conversion', () => {
    it('converts outcome title to lowercase', () => {
      const market = createMockMarket();
      const outcomeToken = createMockOutcomeToken({ title: 'YES' });

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.outcome).toBe('yes');
    });

    it('handles mixed case outcome titles', () => {
      const market = createMockMarket();
      const outcomeToken = createMockOutcomeToken({ title: 'MayBe' });

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.outcome).toBe('maybe');
    });
  });

  describe('with game fields present', () => {
    it('includes all game properties when present', () => {
      const market = createMockMarket({
        game: {
          id: 'game-456',
          startTime: '2024-02-15T18:00:00Z',
          league: 'nba',
          status: 'scheduled',
          period: '1',
          elapsed: '5:45',
          endTime: undefined,
          score: null,
          homeTeam: {
            id: 'team-1',
            name: 'Home Team',
            logo: 'https://example.com/home.png',
            abbreviation: 'HT',
            color: 'color-default',
            alias: 'Home',
          },
          awayTeam: {
            id: 'team-2',
            name: 'Away Team',
            logo: 'https://example.com/away.png',
            abbreviation: 'AT',
            color: 'color-inverse',
            alias: 'Away',
          },
        },
      });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.gameId).toBe('game-456');
      expect(result.gameStartTime).toBe('2024-02-15T18:00:00Z');
      expect(result.gameLeague).toBe('nba');
      expect(result.gameStatus).toBe('scheduled');
      expect(result.gamePeriod).toBe('1');
      expect(result.gameClock).toBe('5:45');
    });
  });

  describe('with undefined game fields', () => {
    it('returns undefined for game properties when game is undefined', () => {
      const market = createMockMarket({ game: undefined });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.gameId).toBeUndefined();
      expect(result.gameStartTime).toBeUndefined();
      expect(result.gameLeague).toBeUndefined();
      expect(result.gameStatus).toBeUndefined();
      expect(result.gamePeriod).toBeUndefined();
      expect(result.gameClock).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles all parameters as undefined', () => {
      const result = parseAnalyticsProperties(undefined, undefined, undefined);

      expect(result.entryPoint).toBe('predict_feed');
      expect(result.transactionType).toBe('mm_predict_buy');
      expect(result.marketId).toBeUndefined();
      expect(result.sharePrice).toBeUndefined();
    });

    it('handles empty market tags array', () => {
      const market = createMockMarket({ tags: [] });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.marketTags).toEqual([]);
    });

    it('handles zero liquidity and volume', () => {
      const market = createMockMarket({ liquidity: 0, volume: 0 });
      const outcomeToken = createMockOutcomeToken();

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.liquidity).toBe(0);
      expect(result.volume).toBe(0);
    });

    it('handles zero share price', () => {
      const market = createMockMarket();
      const outcomeToken = createMockOutcomeToken({ price: 0 });

      const result = parseAnalyticsProperties(
        market,
        outcomeToken,
        'predict_feed',
      );

      expect(result.sharePrice).toBe(0);
    });
  });
});
