import { GameUpdate, PredictMarket, Recurrence } from '../../types';
import { GameCache } from './GameCache';

const createMockGameUpdate = (
  overrides: Partial<GameUpdate> = {},
): GameUpdate => ({
  gameId: 'game-123',
  score: '21-14',
  elapsed: '12:34',
  period: 'Q2',
  status: 'ongoing',
  turn: 'SEA',
  ...overrides,
});

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'test-market',
  title: 'Test Market',
  description: 'A test market',
  image: 'https://example.com/image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['nfl'],
  outcomes: [],
  liquidity: 10000,
  volume: 20000,
  ...overrides,
});

const createMockMarketWithGame = (
  gameId: string = 'game-123',
  marketOverrides: Partial<PredictMarket> = {},
): PredictMarket =>
  createMockMarket({
    game: {
      id: gameId,
      startTime: '2025-01-12T18:00:00Z',
      status: 'scheduled',
      league: 'nfl',
      elapsed: null,
      period: null,
      score: null,
      homeTeam: {
        id: 'team-1',
        name: 'Seattle Seahawks',
        logo: 'https://example.com/sea.png',
        abbreviation: 'SEA',
        color: '#002244',
        alias: 'Seahawks',
      },
      awayTeam: {
        id: 'team-2',
        name: 'Denver Broncos',
        logo: 'https://example.com/den.png',
        abbreviation: 'DEN',
        color: '#FB4F14',
        alias: 'Broncos',
      },
    },
    ...marketOverrides,
  });

describe('GameCache', () => {
  beforeEach(() => {
    GameCache.resetInstance();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = GameCache.getInstance();
      const instance2 = GameCache.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = GameCache.getInstance();
      GameCache.resetInstance();
      const instance2 = GameCache.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('updateGame', () => {
    it('stores game update in cache', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate();

      cache.updateGame('game-123', update);

      expect(cache.getGame('game-123')).toEqual(update);
    });

    it('overwrites existing entry for same gameId', () => {
      const cache = GameCache.getInstance();
      const update1 = createMockGameUpdate({ score: '7-0' });
      const update2 = createMockGameUpdate({ score: '14-7' });

      cache.updateGame('game-123', update1);
      cache.updateGame('game-123', update2);

      expect(cache.getGame('game-123')?.score).toBe('14-7');
    });

    it('stores multiple games independently', () => {
      const cache = GameCache.getInstance();
      const update1 = createMockGameUpdate({ gameId: 'game-1', score: '7-0' });
      const update2 = createMockGameUpdate({
        gameId: 'game-2',
        score: '21-14',
      });

      cache.updateGame('game-1', update1);
      cache.updateGame('game-2', update2);

      expect(cache.getGame('game-1')?.score).toBe('7-0');
      expect(cache.getGame('game-2')?.score).toBe('21-14');
    });
  });

  describe('getGame', () => {
    it('returns null for non-existent game', () => {
      const cache = GameCache.getInstance();

      expect(cache.getGame('nonexistent')).toBeNull();
    });

    it('returns cached game data', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate();

      cache.updateGame('game-123', update);

      expect(cache.getGame('game-123')).toEqual(update);
    });

    it('returns null and removes entry when stale', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate();

      cache.updateGame('game-123', update);
      expect(cache.getCacheSize()).toBe(1);

      jest.advanceTimersByTime(6 * 60 * 1000);

      expect(cache.getGame('game-123')).toBeNull();
      expect(cache.getCacheSize()).toBe(0);
    });

    it('returns data when not yet stale', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate();

      cache.updateGame('game-123', update);
      jest.advanceTimersByTime(4 * 60 * 1000);

      expect(cache.getGame('game-123')).toEqual(update);
    });
  });

  describe('overlayOnMarket', () => {
    it('returns market unchanged when no game property', () => {
      const cache = GameCache.getInstance();
      const market = createMockMarket();

      const result = cache.overlayOnMarket(market);

      expect(result).toEqual(market);
    });

    it('returns market unchanged when no cached data', () => {
      const cache = GameCache.getInstance();
      const market = createMockMarketWithGame();

      const result = cache.overlayOnMarket(market);

      expect(result.game?.score).toBeNull();
      expect(result.game?.period).toBeNull();
    });

    it('merges cached data onto market.game', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate({
        gameId: 'game-123',
        score: '28-21',
        elapsed: '08:42',
        period: 'Q3',
        status: 'ongoing',
        turn: 'DEN',
      });
      const market = createMockMarketWithGame();

      cache.updateGame('game-123', update);
      const result = cache.overlayOnMarket(market);

      expect(result.game?.score).toEqual({ away: 28, home: 21, raw: '28-21' });
      expect(result.game?.elapsed).toBe('08:42');
      expect(result.game?.period).toBe('Q3');
      expect(result.game?.status).toBe('ongoing');
      expect(result.game?.turn).toBe('DEN');
    });

    it('preserves non-overlaid game properties', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate({ gameId: 'game-123' });
      const market = createMockMarketWithGame();

      cache.updateGame('game-123', update);
      const result = cache.overlayOnMarket(market);

      expect(result.game?.id).toBe('game-123');
      expect(result.game?.startTime).toBe('2025-01-12T18:00:00Z');
      expect(result.game?.league).toBe('nfl');
      expect(result.game?.homeTeam.abbreviation).toBe('SEA');
      expect(result.game?.awayTeam.abbreviation).toBe('DEN');
    });

    it('preserves non-game market properties', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate({ gameId: 'game-123' });
      const market = createMockMarketWithGame();

      cache.updateGame('game-123', update);
      const result = cache.overlayOnMarket(market);

      expect(result.id).toBe('market-1');
      expect(result.title).toBe('Test Market');
      expect(result.liquidity).toBe(10000);
    });

    it('does not mutate original market object', () => {
      const cache = GameCache.getInstance();
      const update = createMockGameUpdate({ score: '35-28' });
      const market = createMockMarketWithGame();

      cache.updateGame('game-123', update);
      cache.overlayOnMarket(market);

      expect(market.game?.score).toBeNull();
    });
  });

  describe('overlayOnMarkets', () => {
    it('overlays cached data onto multiple markets', () => {
      const cache = GameCache.getInstance();
      cache.updateGame(
        'game-1',
        createMockGameUpdate({ gameId: 'game-1', score: '14-7' }),
      );
      cache.updateGame(
        'game-2',
        createMockGameUpdate({ gameId: 'game-2', score: '21-14' }),
      );

      const markets = [
        createMockMarketWithGame('game-1', { id: 'market-1' }),
        createMockMarketWithGame('game-2', { id: 'market-2' }),
        createMockMarket({ id: 'market-3' }),
      ];

      const results = cache.overlayOnMarkets(markets);

      expect(results[0].game?.score).toEqual({
        away: 14,
        home: 7,
        raw: '14-7',
      });
      expect(results[1].game?.score).toEqual({
        away: 21,
        home: 14,
        raw: '21-14',
      });
      expect(results[2].game).toBeUndefined();
    });
  });

  describe('pruneStaleEntries', () => {
    it('removes entries older than TTL', () => {
      const cache = GameCache.getInstance();
      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));

      expect(cache.getCacheSize()).toBe(1);

      jest.advanceTimersByTime(6 * 60 * 1000);
      cache.pruneStaleEntries();

      expect(cache.getCacheSize()).toBe(0);
    });

    it('keeps entries within TTL', () => {
      const cache = GameCache.getInstance();
      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));

      jest.advanceTimersByTime(4 * 60 * 1000);
      cache.pruneStaleEntries();

      expect(cache.getCacheSize()).toBe(1);
    });

    it('removes only stale entries', () => {
      const cache = GameCache.getInstance();
      cache.updateGame(
        'game-old',
        createMockGameUpdate({ gameId: 'game-old' }),
      );

      jest.advanceTimersByTime(4 * 60 * 1000);
      cache.updateGame(
        'game-new',
        createMockGameUpdate({ gameId: 'game-new' }),
      );

      jest.advanceTimersByTime(2 * 60 * 1000);
      cache.pruneStaleEntries();

      expect(cache.getCacheSize()).toBe(1);
      expect(cache.getGame('game-old')).toBeNull();
      expect(cache.getGame('game-new')).not.toBeNull();
    });

    it('runs automatically via cleanup interval', () => {
      const cache = GameCache.getInstance();
      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));

      jest.advanceTimersByTime(6 * 60 * 1000);

      expect(cache.getCacheSize()).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all cached entries', () => {
      const cache = GameCache.getInstance();
      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));
      cache.updateGame('game-2', createMockGameUpdate({ gameId: 'game-2' }));

      expect(cache.getCacheSize()).toBe(2);

      cache.clear();

      expect(cache.getCacheSize()).toBe(0);
    });
  });

  describe('debug helpers', () => {
    it('getCacheSize returns correct count', () => {
      const cache = GameCache.getInstance();

      expect(cache.getCacheSize()).toBe(0);

      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));
      expect(cache.getCacheSize()).toBe(1);

      cache.updateGame('game-2', createMockGameUpdate({ gameId: 'game-2' }));
      expect(cache.getCacheSize()).toBe(2);
    });

    it('getCachedGameIds returns all cached game IDs', () => {
      const cache = GameCache.getInstance();
      cache.updateGame('game-1', createMockGameUpdate({ gameId: 'game-1' }));
      cache.updateGame('game-2', createMockGameUpdate({ gameId: 'game-2' }));

      const ids = cache.getCachedGameIds();

      expect(ids).toContain('game-1');
      expect(ids).toContain('game-2');
      expect(ids).toHaveLength(2);
    });
  });
});
