import I18n, { strings } from '../../../../../../locales/i18n';
import type {
  PredictEntityId,
  PredictEvent,
  PredictGame,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  createGamePresentation,
  formatGameStartShort,
  getEventGame,
  getGameTeamOrder,
  getTeamAbbreviation,
} from './createGamePresentation';

const game: PredictGame = {
  status: 'in_progress',
  awayTeam: { name: 'Arizona Cardinals', abbreviation: 'ARI' },
  homeTeam: { name: 'Carolina Panthers' },
  score: { away: '17', home: '21' },
  period: 'Q4',
  clock: '12:22',
  observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
};

const createEvent = (
  overrides: Partial<PredictEvent> = {},
  eventGame: PredictGame = game,
): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  sports: {
    sport: {
      id: 'basketball' as PredictEntityId,
      label: 'Basketball',
    },
    game: eventGame,
  },
  markets: [],
  ...overrides,
});

describe('getEventGame', () => {
  it('returns the Game snapshot when the Event has one', () => {
    const event = createEvent();

    expect(getEventGame(event)).toBe(game);
  });

  it('returns undefined when Sports metadata has no Game', () => {
    const event = createEvent({
      sports: {
        sport: {
          id: 'american-football' as PredictEntityId,
          label: 'American football',
        },
      },
    });

    expect(getEventGame(event)).toBeUndefined();
  });
});

describe('getGameTeamOrder', () => {
  it('lists the away Team first when the Game sends no Team order', () => {
    const result = getGameTeamOrder(game);

    expect(result).toEqual(['away', 'home']);
  });

  it('lists the away Team first without a Game', () => {
    const result = getGameTeamOrder(undefined);

    expect(result).toEqual(['away', 'home']);
  });

  it('lists the away Team first for away_first', () => {
    const result = getGameTeamOrder({ ...game, teamOrder: 'away_first' });

    expect(result).toEqual(['away', 'home']);
  });

  it('lists the home Team first for home_first', () => {
    const result = getGameTeamOrder({ ...game, teamOrder: 'home_first' });

    expect(result).toEqual(['home', 'away']);
  });
});

describe('getTeamAbbreviation', () => {
  it('uses the Team abbreviation when the API sends one', () => {
    const result = getTeamAbbreviation({
      name: 'Arizona Cardinals',
      abbreviation: 'ari',
    });

    expect(result).toBe('ARI');
  });

  it('falls back to the first three letters of the name for a blank abbreviation', () => {
    const result = getTeamAbbreviation({
      name: 'Carolina Panthers',
      abbreviation: '  ',
    });

    expect(result).toBe('CAR');
  });
});

describe('createGamePresentation', () => {
  const originalLocale = I18n.locale;

  beforeAll(() => {
    I18n.locale = 'en-US';
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('projects Team identity from abbreviation or name fallback', () => {
    const event = createEvent();

    const result = createGamePresentation(event, game);

    expect(result.teams.away).toEqual({
      team: game.awayTeam,
      abbreviation: 'ARI',
    });
    expect(result.teams.home).toEqual({
      team: game.homeTeam,
      abbreviation: 'CAR',
    });
  });

  it('projects compact and featured status for a scheduled Game', () => {
    const scheduledGame: PredictGame = { ...game, status: 'scheduled' };
    const event = createEvent({}, scheduledGame);

    const result = createGamePresentation(event, scheduledGame);

    expect(result.status.compact).toEqual({
      label: 'September 10 · 8:20 PM',
      metadata: '',
    });
    expect(result.status.featured).toEqual({
      label: 'Thursday, September 10',
      metadata: '8:20 PM',
    });
  });

  it('projects Event Screen status with a short start for a scheduled Game', () => {
    const scheduledGame: PredictGame = {
      ...game,
      status: 'scheduled',
      period: undefined,
      clock: undefined,
    };
    const event = createEvent({}, scheduledGame);

    const result = createGamePresentation(event, scheduledGame);

    expect(result.status.detail.label).toBe(
      strings('predict.game_status.scheduled'),
    );
    expect(result.status.detail.metadata).toContain('Sep');
    expect(result.status.detail.metadata).toContain('8:20 PM');
  });

  it('projects live metadata for compact and Event Screen variants', () => {
    const event = createEvent();

    const result = createGamePresentation(event, game);

    expect(result.status.compact).toEqual({
      label: strings('predict.game_status.live'),
      metadata: 'Q4 · 12:22',
    });
    expect(result.status.detail).toEqual({
      label: strings('predict.game_status.live'),
      metadata: 'Q4 · 12:22',
    });
  });

  it('keeps completed Game period and clock on the Event Screen', () => {
    const completedGame: PredictGame = { ...game, status: 'completed' };
    const event = createEvent({}, completedGame);

    const result = createGamePresentation(event, completedGame);

    expect(result.status.compact).toEqual({
      label: strings('predict.game_status.final'),
      metadata: '',
    });
    expect(result.status.detail).toEqual({
      label: strings('predict.game_status.final'),
      metadata: 'Q4 · 12:22',
    });
  });
});

describe('formatGameStartShort', () => {
  const originalLocale = I18n.locale;
  // Tuesday 2026-09-08, noon in the test time zone.
  const now = new Date('2026-09-08T16:00:00Z');

  beforeAll(() => {
    I18n.locale = 'en-US';
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it.each([
    ['later today', '2026-09-08T23:15:00Z', /^Tue · 7:15\sPM$/],
    ['six days ahead', '2026-09-14T17:00:00Z', /^Mon · 1:00\sPM$/],
    ['two days ago', '2026-09-06T17:00:00Z', /^Sun · 1:00\sPM$/],
    ['seven days ahead', '2026-09-15T17:00:00Z', /^Sep 15 · 1:00\sPM$/],
    ['weeks ahead', '2026-11-23T18:00:00Z', /^Nov 23 · 1:00\sPM$/],
  ])('formats a start %s', (_, startsAt, expected) => {
    expect(formatGameStartShort(startsAt, now)).toMatch(expected);
  });

  it('counts calendar days in the device time zone, not UTC', () => {
    // 01:00 UTC on the 15th is still the 14th, 9 PM, in the test time zone.
    expect(formatGameStartShort('2026-09-15T01:00:00Z', now)).toMatch(
      /^Mon · 9:00\sPM$/,
    );
  });
});
