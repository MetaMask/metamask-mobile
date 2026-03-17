import { TeamsCache } from './TeamsCache';
import { PolymarketApiTeam } from './types';

jest.mock('./utils', () => ({
  getPolymarketEndpoints: jest.fn().mockReturnValue({
    GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockTeam = (
  overrides: Partial<PolymarketApiTeam> = {},
): PolymarketApiTeam => ({
  id: 'team-1',
  name: 'Seattle Seahawks',
  logo: 'https://example.com/sea.png',
  abbreviation: 'SEA',
  color: '#002244',
  alias: 'Seahawks',
  ...overrides,
});

const mockNflTeams: PolymarketApiTeam[] = [
  createMockTeam({
    id: 'team-sea',
    name: 'Seattle Seahawks',
    abbreviation: 'SEA',
    color: '#002244',
    alias: 'Seahawks',
  }),
  createMockTeam({
    id: 'team-den',
    name: 'Denver Broncos',
    abbreviation: 'DEN',
    color: '#FB4F14',
    alias: 'Broncos',
  }),
  createMockTeam({
    id: 'team-sf',
    name: 'San Francisco 49ers',
    abbreviation: 'SF',
    color: '#AA0000',
    alias: '49ers',
  }),
];

describe('TeamsCache', () => {
  beforeEach(() => {
    TeamsCache.resetInstance();
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = TeamsCache.getInstance();
      const instance2 = TeamsCache.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('creates new instance after reset', () => {
      const instance1 = TeamsCache.getInstance();
      TeamsCache.resetInstance();
      const instance2 = TeamsCache.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('clears cache data on reset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const instance1 = TeamsCache.getInstance();
      await instance1.ensureLeagueLoaded('nfl');

      expect(instance1.isLeagueLoaded('nfl')).toBe(true);

      TeamsCache.resetInstance();
      const instance2 = TeamsCache.getInstance();

      expect(instance2.isLeagueLoaded('nfl')).toBe(false);
    });
  });

  describe('ensureLeagueLoaded', () => {
    it('fetches teams from API on first call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/teams?league=nfl',
      );
    });

    it('does not fetch again when already loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');
      await cache.ensureLeagueLoaded('nfl');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent requests for same league', async () => {
      let resolvePromise: (value: unknown) => void = () => undefined;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(fetchPromise);
      const cache = TeamsCache.getInstance();

      const promise1 = cache.ensureLeagueLoaded('nfl');
      const promise2 = cache.ensureLeagueLoaded('nfl');
      const promise3 = cache.ensureLeagueLoaded('nfl');

      resolvePromise({
        ok: true,
        json: async () => mockNflTeams,
      });

      await Promise.all([promise1, promise2, promise3]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.isLeagueLoaded('nfl')).toBe(false);
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.isLeagueLoaded('nfl')).toBe(false);
    });

    it('handles invalid API response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.isLeagueLoaded('nfl')).toBe(false);
    });

    it('skips teams without abbreviation', async () => {
      const teamsWithMissingAbbr = [
        createMockTeam({ abbreviation: 'SEA' }),
        createMockTeam({ abbreviation: '' }),
        createMockTeam({ abbreviation: 'DEN' }),
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => teamsWithMissingAbbr,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.getTeamCount('nfl')).toBe(2);
    });
  });

  describe('ensureLeaguesLoaded', () => {
    it('loads multiple leagues in parallel', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeaguesLoaded(['nfl']);

      expect(cache.isLeagueLoaded('nfl')).toBe(true);
    });

    it('does not refetch already loaded leagues', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();
      await cache.ensureLeagueLoaded('nfl');
      mockFetch.mockClear();

      await cache.ensureLeaguesLoaded(['nfl']);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles empty leagues array', async () => {
      const cache = TeamsCache.getInstance();

      await cache.ensureLeaguesLoaded([]);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('getTeam', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      await TeamsCache.getInstance().ensureLeagueLoaded('nfl');
    });

    it('returns team by abbreviation (lowercase)', () => {
      const cache = TeamsCache.getInstance();

      const team = cache.getTeam('nfl', 'sea');

      expect(team?.name).toBe('Seattle Seahawks');
    });

    it('returns team by abbreviation (uppercase)', () => {
      const cache = TeamsCache.getInstance();

      const team = cache.getTeam('nfl', 'SEA');

      expect(team?.name).toBe('Seattle Seahawks');
    });

    it('returns team by abbreviation (mixed case)', () => {
      const cache = TeamsCache.getInstance();

      const team = cache.getTeam('nfl', 'SeA');

      expect(team?.name).toBe('Seattle Seahawks');
    });

    it('returns undefined for unknown abbreviation', () => {
      const cache = TeamsCache.getInstance();

      const team = cache.getTeam('nfl', 'xyz');

      expect(team).toBeUndefined();
    });

    it('returns team from loaded league', () => {
      const cache = TeamsCache.getInstance();

      const team = cache.getTeam('nfl', 'sea');

      expect(team).toBeDefined();
      expect(team?.name).toBe('Seattle Seahawks');
    });
  });

  describe('isLeagueLoaded', () => {
    it('returns false for unloaded league', () => {
      const cache = TeamsCache.getInstance();

      expect(cache.isLeagueLoaded('nfl')).toBe(false);
    });

    it('returns true after successful load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.isLeagueLoaded('nfl')).toBe(true);
    });
  });

  describe('clear', () => {
    it('removes all cached data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();
      await cache.ensureLeagueLoaded('nfl');

      expect(cache.isLeagueLoaded('nfl')).toBe(true);

      cache.clear();

      expect(cache.isLeagueLoaded('nfl')).toBe(false);
    });
  });

  describe('getTeamCount', () => {
    it('returns 0 for unloaded league', () => {
      const cache = TeamsCache.getInstance();

      expect(cache.getTeamCount('nfl')).toBe(0);
    });

    it('returns correct count after loading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded('nfl');

      expect(cache.getTeamCount('nfl')).toBe(3);
    });
  });
});
