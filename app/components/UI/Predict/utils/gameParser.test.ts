import {
  parseNflSlugTeams,
  parseGameSlugTeams,
  isNflGameEvent,
  isLiveSportsEvent,
  getEventLeague,
  getGameStatus,
  formatPeriodDisplay,
  mapApiTeamToPredictTeam,
  buildNflGameData,
  buildGameData,
} from './gameParser';
import {
  PolymarketApiEvent,
  PolymarketApiTeam,
} from '../providers/polymarket/types';
import { PredictSportTeam, PredictSportsLeague } from '../types';

const createMockApiTeam = (
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

const createMockEvent = (
  overrides: Partial<PolymarketApiEvent> = {},
): PolymarketApiEvent => ({
  id: 'event-1',
  slug: 'nfl-sea-den-2025-01-12',
  title: 'Seattle Seahawks vs Denver Broncos',
  description: 'NFL game',
  icon: 'https://example.com/icon.png',
  closed: false,
  series: [],
  markets: [],
  tags: [
    { id: '1', label: 'NFL', slug: 'nfl' },
    { id: '2', label: 'Games', slug: 'games' },
  ],
  liquidity: 10000,
  volume: 20000,
  ...overrides,
});

describe('gameParser', () => {
  describe('getEventLeague', () => {
    it('returns "nfl" for event with nfl tag, games tag, and valid slug', () => {
      const event = createMockEvent();

      const result = getEventLeague(event);

      expect(result).toBe('nfl');
    });

    it('returns null when missing nfl tag', () => {
      const event = createMockEvent({
        tags: [{ id: '2', label: 'Games', slug: 'games' }],
      });

      const result = getEventLeague(event);

      expect(result).toBeNull();
    });

    it('returns null when missing games tag', () => {
      const event = createMockEvent({
        tags: [{ id: '1', label: 'NFL', slug: 'nfl' }],
      });

      const result = getEventLeague(event);

      expect(result).toBeNull();
    });

    it('returns null for invalid slug format', () => {
      const event = createMockEvent({
        slug: 'some-other-market',
      });

      const result = getEventLeague(event);

      expect(result).toBeNull();
    });

    it('returns null when tags is not an array', () => {
      const event = createMockEvent({
        tags: undefined as unknown as [],
      });

      const result = getEventLeague(event);

      expect(result).toBeNull();
    });
  });

  describe('isLiveSportsEvent', () => {
    it('returns true when event league is in enabled leagues', () => {
      const event = createMockEvent();

      const result = isLiveSportsEvent(event, ['nfl']);

      expect(result).toBe(true);
    });

    it('returns false when event league is not in enabled leagues', () => {
      const event = createMockEvent();

      const result = isLiveSportsEvent(event, []);

      expect(result).toBe(false);
    });

    it('returns false when event is not a sports event', () => {
      const event = createMockEvent({
        slug: 'some-other-market',
        tags: [],
      });

      const result = isLiveSportsEvent(event, ['nfl']);

      expect(result).toBe(false);
    });
  });

  describe('parseGameSlugTeams', () => {
    it('extracts team abbreviations from valid NFL slug', () => {
      const result = parseGameSlugTeams('nfl-sea-den-2025-01-12', 'nfl');

      expect(result).toEqual({
        awayAbbreviation: 'sea',
        homeAbbreviation: 'den',
        dateString: '2025-01-12',
      });
    });

    it('returns null for non-NFL slug', () => {
      const result = parseGameSlugTeams('some-other-event', 'nfl');

      expect(result).toBeNull();
    });

    it('returns null for invalid date format', () => {
      const result = parseGameSlugTeams('nfl-sea-den-01-12-2025', 'nfl');

      expect(result).toBeNull();
    });
  });

  describe('parseNflSlugTeams (deprecated)', () => {
    it('extracts team abbreviations from valid NFL slug', () => {
      const result = parseNflSlugTeams('nfl-sea-den-2025-01-12');

      expect(result).toEqual({
        awayAbbreviation: 'sea',
        homeAbbreviation: 'den',
        dateString: '2025-01-12',
      });
    });

    it('returns null for non-NFL slug', () => {
      const result = parseNflSlugTeams('some-other-event');

      expect(result).toBeNull();
    });

    it('returns null for invalid date format', () => {
      const result = parseNflSlugTeams('nfl-sea-den-01-12-2025');

      expect(result).toBeNull();
    });

    it('returns null for missing team abbreviation', () => {
      const result = parseNflSlugTeams('nfl-sea--2025-01-12');

      expect(result).toBeNull();
    });

    it('returns null for uppercase slug', () => {
      const result = parseNflSlugTeams('NFL-SEA-DEN-2025-01-12');

      expect(result).toBeNull();
    });

    it('extracts three-letter abbreviations', () => {
      const result = parseNflSlugTeams('nfl-buf-nyj-2025-01-12');

      expect(result).toEqual({
        awayAbbreviation: 'buf',
        homeAbbreviation: 'nyj',
        dateString: '2025-01-12',
      });
    });
  });

  describe('isNflGameEvent (deprecated)', () => {
    it('returns true for event with nfl tag, games tag, and valid slug', () => {
      const event = createMockEvent();

      const result = isNflGameEvent(event);

      expect(result).toBe(true);
    });

    it('returns false when missing nfl tag', () => {
      const event = createMockEvent({
        tags: [{ id: '2', label: 'Games', slug: 'games' }],
      });

      const result = isNflGameEvent(event);

      expect(result).toBe(false);
    });

    it('returns false when missing games tag', () => {
      const event = createMockEvent({
        tags: [{ id: '1', label: 'NFL', slug: 'nfl' }],
      });

      const result = isNflGameEvent(event);

      expect(result).toBe(false);
    });

    it('returns false for invalid slug format', () => {
      const event = createMockEvent({
        slug: 'some-other-market',
      });

      const result = isNflGameEvent(event);

      expect(result).toBe(false);
    });

    it('returns false when tags is not an array', () => {
      const event = createMockEvent({
        tags: undefined as unknown as [],
      });

      const result = isNflGameEvent(event);

      expect(result).toBe(false);
    });
  });

  describe('getGameStatus', () => {
    it('returns "ended" when event.ended is true', () => {
      const event = createMockEvent({ ended: true });

      const result = getGameStatus(event);

      expect(result).toBe('ended');
    });

    it('returns "ended" when event.closed is true', () => {
      const event = createMockEvent({ closed: true });

      const result = getGameStatus(event);

      expect(result).toBe('ended');
    });

    it('returns "ended" when period is FT', () => {
      const event = createMockEvent({ period: 'FT' });

      const result = getGameStatus(event);

      expect(result).toBe('ended');
    });

    it('returns "ended" when period is VFT', () => {
      const event = createMockEvent({ period: 'VFT' });

      const result = getGameStatus(event);

      expect(result).toBe('ended');
    });

    it('returns "ongoing" when event.live is true', () => {
      const event = createMockEvent({ live: true });

      const result = getGameStatus(event);

      expect(result).toBe('ongoing');
    });

    it('returns "ongoing" when score is non-zero', () => {
      const event = createMockEvent({ score: '14-7' });

      const result = getGameStatus(event);

      expect(result).toBe('ongoing');
    });

    it('returns "ongoing" when elapsed has value', () => {
      const event = createMockEvent({ elapsed: '12:34' });

      const result = getGameStatus(event);

      expect(result).toBe('ongoing');
    });

    it('returns "ongoing" when period is Q1', () => {
      const event = createMockEvent({ period: 'Q1' });

      const result = getGameStatus(event);

      expect(result).toBe('ongoing');
    });

    it('returns "scheduled" for event with no game indicators', () => {
      const event = createMockEvent();

      const result = getGameStatus(event);

      expect(result).toBe('scheduled');
    });

    it('returns "scheduled" when period is NS', () => {
      const event = createMockEvent({ period: 'NS' });

      const result = getGameStatus(event);

      expect(result).toBe('scheduled');
    });

    it('returns "scheduled" when score is 0-0', () => {
      const event = createMockEvent({ score: '0-0' });

      const result = getGameStatus(event);

      expect(result).toBe('scheduled');
    });
  });

  describe('formatPeriodDisplay', () => {
    it('returns "Halftime" for HT', () => {
      expect(formatPeriodDisplay('HT')).toBe('Halftime');
    });

    it('returns "Overtime" for OT', () => {
      expect(formatPeriodDisplay('OT')).toBe('Overtime');
    });

    it('returns "Final" for FT', () => {
      expect(formatPeriodDisplay('FT')).toBe('Final');
    });

    it('returns "Final" for VFT', () => {
      expect(formatPeriodDisplay('VFT')).toBe('Final');
    });

    it('returns original period for Q1', () => {
      expect(formatPeriodDisplay('Q1')).toBe('Q1');
    });

    it('returns original period for Q4', () => {
      expect(formatPeriodDisplay('Q4')).toBe('Q4');
    });

    it('handles lowercase input', () => {
      expect(formatPeriodDisplay('ht')).toBe('Halftime');
    });

    it('handles whitespace', () => {
      expect(formatPeriodDisplay('  HT  ')).toBe('Halftime');
    });
  });

  describe('mapApiTeamToPredictTeam', () => {
    it('maps all fields from API team to domain team', () => {
      const apiTeam = createMockApiTeam();

      const result = mapApiTeamToPredictTeam(apiTeam);

      expect(result).toEqual({
        id: 'team-1',
        name: 'Seattle Seahawks',
        logo: 'https://example.com/sea.png',
        abbreviation: 'SEA',
        color: '#002244',
        alias: 'Seahawks',
      });
    });

    it('preserves all API team properties', () => {
      const apiTeam = createMockApiTeam({
        id: 'custom-id',
        name: 'Custom Team',
        logo: 'https://custom.com/logo.png',
        abbreviation: 'CUS',
        color: '#FFFFFF',
        alias: 'Customs',
      });

      const result = mapApiTeamToPredictTeam(apiTeam);

      expect(result.id).toBe('custom-id');
      expect(result.name).toBe('Custom Team');
      expect(result.logo).toBe('https://custom.com/logo.png');
      expect(result.abbreviation).toBe('CUS');
      expect(result.color).toBe('#FFFFFF');
      expect(result.alias).toBe('Customs');
    });
  });

  describe('buildGameData', () => {
    const seaTeam: PredictSportTeam = {
      id: 'team-sea',
      name: 'Seattle Seahawks',
      logo: 'https://example.com/sea.png',
      abbreviation: 'SEA',
      color: '#002244',
      alias: 'Seahawks',
    };

    const denTeam: PredictSportTeam = {
      id: 'team-den',
      name: 'Denver Broncos',
      logo: 'https://example.com/den.png',
      abbreviation: 'DEN',
      color: '#FB4F14',
      alias: 'Broncos',
    };

    const teamLookup = (
      league: PredictSportsLeague,
      abbr: string,
    ): PredictSportTeam | undefined => {
      if (league !== 'nfl') return undefined;
      const teams: Record<string, PredictSportTeam> = {
        sea: seaTeam,
        den: denTeam,
      };
      return teams[abbr.toLowerCase()];
    };

    it('builds complete game data from event', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: '2025-01-12T18:00:00Z',
        score: '14-7',
        elapsed: '08:42',
        period: 'Q2',
        live: true,
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result).toEqual({
        id: 'game-123',
        startTime: '2025-01-12T18:00:00Z',
        status: 'ongoing',
        league: 'nfl',
        elapsed: '08:42',
        period: 'Q2',
        score: '14-7',
        homeTeam: denTeam,
        awayTeam: seaTeam,
      });
    });

    it('returns null when gameId is missing', () => {
      const event = createMockEvent({ gameId: undefined });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when slug cannot be parsed', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'invalid-slug',
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when away team not found', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'nfl-xyz-den-2025-01-12',
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when home team not found', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'nfl-sea-xyz-2025-01-12',
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result).toBeNull();
    });

    it('uses endDate as fallback for startTime', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: undefined,
        endDate: '2025-01-12T21:00:00Z',
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result?.startTime).toBe('2025-01-12T21:00:00Z');
    });

    it('uses date from slug as last resort for startTime', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: undefined,
        endDate: undefined,
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result?.startTime).toBe('2025-01-12T00:00:00Z');
    });

    it('defaults empty strings for missing game fields', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        score: undefined,
        elapsed: undefined,
        period: undefined,
      });

      const result = buildGameData(event, 'nfl', teamLookup);

      expect(result?.score).toBe('');
      expect(result?.elapsed).toBe('');
      expect(result?.period).toBe('');
    });
  });

  describe('buildNflGameData (deprecated)', () => {
    const seaTeam: PredictSportTeam = {
      id: 'team-sea',
      name: 'Seattle Seahawks',
      logo: 'https://example.com/sea.png',
      abbreviation: 'SEA',
      color: '#002244',
      alias: 'Seahawks',
    };

    const denTeam: PredictSportTeam = {
      id: 'team-den',
      name: 'Denver Broncos',
      logo: 'https://example.com/den.png',
      abbreviation: 'DEN',
      color: '#FB4F14',
      alias: 'Broncos',
    };

    const teamLookup = (abbr: string): PredictSportTeam | undefined => {
      const teams: Record<string, PredictSportTeam> = {
        sea: seaTeam,
        den: denTeam,
      };
      return teams[abbr.toLowerCase()];
    };

    it('builds complete game data from event', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: '2025-01-12T18:00:00Z',
        score: '14-7',
        elapsed: '08:42',
        period: 'Q2',
        live: true,
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result).toEqual({
        id: 'game-123',
        startTime: '2025-01-12T18:00:00Z',
        status: 'ongoing',
        league: 'nfl',
        elapsed: '08:42',
        period: 'Q2',
        score: '14-7',
        homeTeam: denTeam,
        awayTeam: seaTeam,
      });
    });

    it('returns null when gameId is missing', () => {
      const event = createMockEvent({ gameId: undefined });

      const result = buildNflGameData(event, teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when slug cannot be parsed', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'invalid-slug',
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when away team not found', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'nfl-xyz-den-2025-01-12',
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result).toBeNull();
    });

    it('returns null when home team not found', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        slug: 'nfl-sea-xyz-2025-01-12',
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result).toBeNull();
    });

    it('uses endDate as fallback for startTime', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: undefined,
        endDate: '2025-01-12T21:00:00Z',
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result?.startTime).toBe('2025-01-12T21:00:00Z');
    });

    it('uses date from slug as last resort for startTime', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        startTime: undefined,
        endDate: undefined,
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result?.startTime).toBe('2025-01-12T00:00:00Z');
    });

    it('defaults empty strings for missing game fields', () => {
      const event = createMockEvent({
        gameId: 'game-123',
        score: undefined,
        elapsed: undefined,
        period: undefined,
      });

      const result = buildNflGameData(event, teamLookup);

      expect(result?.score).toBe('');
      expect(result?.elapsed).toBe('');
      expect(result?.period).toBe('');
    });
  });
});
