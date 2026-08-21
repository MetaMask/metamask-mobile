import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import type { PredictSportsLeague } from '../../types';
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
  color: TEST_HEX_COLORS.TEAM_SEA,
  alias: 'Seahawks',
  ...overrides,
});

const neededTeams = (
  entries: [PredictSportsLeague, string[]][],
): Map<PredictSportsLeague, string[]> => new Map(entries);

const mockNflTeams: PolymarketApiTeam[] = [
  createMockTeam({
    id: 'team-sea',
    name: 'Seattle Seahawks',
    abbreviation: 'SEA',
    color: TEST_HEX_COLORS.TEAM_SEA,
    alias: 'Seahawks',
  }),
  createMockTeam({
    id: 'team-den',
    name: 'Denver Broncos',
    abbreviation: 'DEN',
    color: TEST_HEX_COLORS.TEAM_DEN,
    alias: 'Broncos',
  }),
  createMockTeam({
    id: 'team-sf',
    name: 'San Francisco 49ers',
    abbreviation: 'SF',
    color: TEST_HEX_COLORS.TEAM_SF,
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
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it.each([
      ['cs2', 'csgo'],
      ['val', 'valorant'],
    ] as const)('uses the %s team API alias %s', async (league, teamLeague) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureLeagueLoaded(league);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://gamma-api.polymarket.com/teams?league=${teamLeague}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
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

  describe('ensureTeamsLoaded', () => {
    it('fetches only specified teams from API with abbreviation params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockNflTeams[0], mockNflTeams[1]],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', ['sea', 'den']);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('abbreviation=sea');
      expect(callUrl).toContain('abbreviation=den');
      expect(callUrl).toContain('league=nfl');
    });

    it.each([
      ['cs2', 'csgo'],
      ['val', 'valorant'],
    ] as const)(
      'uses the %s team API alias %s for batch requests',
      async (league, teamLeague) => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });
        const cache = TeamsCache.getInstance();

        await cache.ensureTeamsLoaded(league, ['team']);

        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain(`league=${teamLeague}`);
      },
    );

    it('skips fetch when all teams are already cached', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();
      await cache.ensureLeagueLoaded('nfl');
      mockFetch.mockClear();

      await cache.ensureTeamsLoaded('nfl', ['sea', 'den']);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('caches fetched teams and makes them available via getTeam', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockNflTeams[0], mockNflTeams[1]],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', ['sea', 'den']);

      const seaTeam = cache.getTeam('nfl', 'sea');
      const denTeam = cache.getTeam('nfl', 'den');

      expect(seaTeam?.name).toBe('Seattle Seahawks');
      expect(denTeam?.name).toBe('Denver Broncos');
    });

    it('deduplicates concurrent requests for same batch', async () => {
      let resolvePromise: (value: unknown) => void = () => undefined;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(fetchPromise);
      const cache = TeamsCache.getInstance();

      const promise1 = cache.ensureTeamsLoaded('nfl', ['sea', 'den']);
      const promise2 = cache.ensureTeamsLoaded('nfl', ['sea', 'den']);
      const promise3 = cache.ensureTeamsLoaded('nfl', ['sea', 'den']);

      resolvePromise({
        ok: true,
        json: async () => [mockNflTeams[0], mockNflTeams[1]],
      });

      await Promise.all([promise1, promise2, promise3]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('creates league sub-map lazily', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockNflTeams[0]],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', ['sea']);

      const team = cache.getTeam('nfl', 'sea');

      expect(team?.name).toBe('Seattle Seahawks');
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', ['sea', 'den']);

      const seaTeam = cache.getTeam('nfl', 'sea');

      expect(seaTeam).toBeUndefined();
    });

    it('handles empty abbreviations array', async () => {
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', []);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('applies TEAM_COLOR_OVERRIDES to fetched teams', async () => {
      const seaTeamWithOriginalColor = createMockTeam({
        abbreviation: 'sea',
        color: TEST_HEX_COLORS.TEAM_SEA,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [seaTeamWithOriginalColor],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoaded('nfl', ['sea']);

      const team = cache.getTeam('nfl', 'sea');

      expect(team?.color).toBe(TEST_HEX_COLORS.TEAM_SEA_OVERRIDE);
    });
  });

  describe('ensureTeamsLoadedBatch', () => {
    const mockNbaTeams: PolymarketApiTeam[] = [
      createMockTeam({
        id: 'team-lal',
        name: 'Los Angeles Lakers',
        abbreviation: 'LAL',
        color: TEST_HEX_COLORS.TEAM_LAL,
        alias: 'Lakers',
        league: 'nba',
      }),
      createMockTeam({
        id: 'team-bos',
        name: 'Boston Celtics',
        abbreviation: 'BOS',
        color: TEST_HEX_COLORS.TEAM_BOS,
        alias: 'Celtics',
        league: 'nba',
      }),
    ];

    it('fetches all needed leagues and abbreviations in one request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          createMockTeam({
            id: 'team-sea',
            abbreviation: 'SEA',
            league: 'nfl',
          }),
          createMockTeam({
            id: 'team-swiatek',
            name: 'Iga Swiatek',
            abbreviation: 'swiatek',
            league: 'wta',
          }),
        ],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['nfl', ['sea']],
          ['wta', ['swiatek']],
        ]),
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('league=nfl');
      expect(callUrl).toContain('league=wta');
      expect(callUrl).toContain('abbreviation=sea');
      expect(callUrl).toContain('abbreviation=swiatek');
      expect(cache.getTeam('nfl', 'sea')?.id).toBe('team-sea');
      expect(cache.getTeam('wta', 'swiatek')?.id).toBe('team-swiatek');
    });

    it('maps API league aliases back onto Predict leagues', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          createMockTeam({
            id: 'team-navi',
            name: 'Natus Vincere',
            abbreviation: 'navi',
            league: 'csgo',
          }),
        ],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(neededTeams([['cs2', ['navi']]]));

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('league=csgo');
      expect(cache.getTeam('cs2', 'navi')?.name).toBe('Natus Vincere');
    });

    it('caches teams into the league matching team.league', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          createMockTeam({
            id: 'team-sea',
            abbreviation: 'SEA',
            league: 'nfl',
          }),
          mockNbaTeams[0],
        ],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['nfl', ['sea']],
          ['nba', ['lal']],
        ]),
      );

      expect(cache.getTeam('nfl', 'sea')?.id).toBe('team-sea');
      expect(cache.getTeam('nba', 'lal')?.id).toBe('team-lal');
      expect(cache.getTeam('nfl', 'lal')).toBeUndefined();
      expect(cache.getTeam('nba', 'sea')).toBeUndefined();
    });

    it('caches teams without league onto the league that requested the abbreviation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockNflTeams[0]],
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['nfl', ['sea']],
          ['nba', ['lal']],
        ]),
      );

      expect(cache.getTeam('nfl', 'sea')?.name).toBe('Seattle Seahawks');
      expect(cache.getTeam('nba', 'sea')).toBeUndefined();
      expect(cache.getTeam('nba', 'lal')).toBeUndefined();
    });

    it('skips fetch when every requested team is already cached', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNflTeams,
      });
      const cache = TeamsCache.getInstance();
      await cache.ensureLeagueLoaded('nfl');
      mockFetch.mockClear();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([['nfl', ['sea', 'den']]]),
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches only leagues that still have uncached teams', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNflTeams,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNbaTeams,
        });
      const cache = TeamsCache.getInstance();
      await cache.ensureLeagueLoaded('nfl');
      mockFetch.mockClear();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['nfl', ['sea']],
          ['nba', ['lal']],
        ]),
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('league=nba');
      expect(callUrl).not.toContain('league=nfl');
      expect(cache.getTeam('nba', 'lal')?.name).toBe('Los Angeles Lakers');
    });

    it('deduplicates concurrent requests for the same batch', async () => {
      let resolvePromise: (value: unknown) => void = () => undefined;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(fetchPromise);
      const cache = TeamsCache.getInstance();
      const firstBatch = neededTeams([
        ['nfl', ['sea']],
        ['wta', ['swiatek']],
      ]);

      const promise1 = cache.ensureTeamsLoadedBatch(firstBatch);
      const promise2 = cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['wta', ['swiatek']],
          ['nfl', ['sea']],
        ]),
      );

      resolvePromise({
        ok: true,
        json: async () => [
          createMockTeam({ abbreviation: 'SEA', league: 'nfl' }),
          createMockTeam({ abbreviation: 'swiatek', league: 'wta' }),
        ],
      });

      await Promise.all([promise1, promise2]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles an empty map without fetching', async () => {
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(neededTeams([]));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('leaves teams uncached when the API returns an error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const cache = TeamsCache.getInstance();

      await cache.ensureTeamsLoadedBatch(
        neededTeams([
          ['nfl', ['sea']],
          ['nba', ['lal']],
        ]),
      );

      expect(cache.getTeam('nfl', 'sea')).toBeUndefined();
      expect(cache.getTeam('nba', 'lal')).toBeUndefined();
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
