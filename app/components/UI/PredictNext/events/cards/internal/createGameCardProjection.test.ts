import I18n, { strings } from '../../../../../../../locales/i18n';
import { fullGameMoneylineMetadata } from '../../../contracts/v1/fixtures/fullGameMoneyline';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../../types';
import {
  createGameCardProjection,
  formatGameTeamLabel,
} from './createGameCardProjection';

const createOutcome = (
  id: string,
  gameSelection?: PredictOutcome['gameSelection'],
  askPrice?: string,
): PredictOutcome => ({
  id: id as PredictEntityId,
  side: gameSelection ? 'yes' : 'no',
  label: id,
  gameSelection,
  askPrice: askPrice as PredictDecimal | undefined,
});

const createMarket = (
  id: string,
  selection: PredictOutcome['gameSelection'],
  askPrice?: string,
  status: PredictMarket['status'] = 'active',
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status,
  ...fullGameMoneylineMetadata(),
  outcomes: [
    createOutcome(`${id}-yes`, selection, askPrice),
    createOutcome(`${id}-no`),
  ],
});

const game: PredictGame = {
  status: 'in_progress',
  awayTeam: { name: 'Arizona Cardinals', abbreviation: 'ARI' },
  homeTeam: { name: 'Carolina Panthers', abbreviation: 'CAR' },
  score: { away: '17', home: '21' },
  period: 'Q4',
  clock: '12:22',
  observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
};

const createEvent = (
  markets: readonly PredictMarket[],
  overrides: Partial<PredictEvent> = {},
): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  sports: {
    sport: {
      id: 'american-football' as PredictEntityId,
      label: 'American football',
    },
    competition: { id: 'nfl' as PredictEntityId, label: 'NFL' },
    game,
  },
  markets,
  ...overrides,
});

describe('formatGameTeamLabel', () => {
  it('combines the abbreviation with the short mascot name', () => {
    const label = formatGameTeamLabel(
      { name: 'Carolina Panthers', abbreviation: 'CAR' },
      'CAR',
    );

    expect(label).toBe('CAR Panthers');
  });

  it('keeps a distinct abbreviation before a single-word team name', () => {
    const label = formatGameTeamLabel(
      { name: 'Packers', abbreviation: 'GB' },
      'GB',
    );

    expect(label).toBe('GB Packers');
  });

  it('avoids duplicating when a single-word team name matches the abbreviation', () => {
    const label = formatGameTeamLabel(
      { name: 'Duke', abbreviation: 'DUKE' },
      'DUKE',
    );

    expect(label).toBe('Duke');
  });

  it('uses the single-word name when no abbreviation was provided', () => {
    const label = formatGameTeamLabel({ name: 'Packers' }, 'PAC');

    expect(label).toBe('Packers');
  });

  it('falls back to the abbreviation when the team name is blank', () => {
    const label = formatGameTeamLabel(
      { name: '   ', abbreviation: 'ARI' },
      'ARI',
    );

    expect(label).toBe('ARI');
  });

  it.each([
    [
      { name: 'Portland Trail Blazers', abbreviation: 'POR' },
      'POR',
      'POR Trail Blazers',
    ],
    [
      { name: 'Toronto Maple Leafs', abbreviation: 'TOR' },
      'TOR',
      'TOR Maple Leafs',
    ],
    [{ name: 'Boston Red Sox', abbreviation: 'BOS' }, 'BOS', 'BOS Red Sox'],
    [{ name: 'Ohio State', abbreviation: 'OSU' }, 'OSU', 'OSU Ohio State'],
    [
      { name: 'Ohio State Buckeyes', abbreviation: 'OSU' },
      'OSU',
      'OSU Buckeyes',
    ],
    [{ name: 'New England Patriots', abbreviation: 'NE' }, 'NE', 'NE Patriots'],
    [
      { name: 'Manchester United', abbreviation: 'MUN' },
      'MUN',
      'MUN Manchester United',
    ],
    [
      { name: 'North Carolina Tar Heels', abbreviation: 'UNC' },
      'UNC',
      'UNC Tar Heels',
    ],
    [
      { name: 'North Carolina', abbreviation: 'UNC' },
      'UNC',
      'UNC North Carolina',
    ],
  ])(
    'preserves multi-word nicknames and school or club names for %j',
    (team, abbreviation, expected) => {
      const label = formatGameTeamLabel(team, abbreviation);

      expect(label).toBe(expected);
    },
  );
});

describe('createGameCardProjection', () => {
  const originalLocale = I18n.locale;

  beforeAll(() => {
    I18n.locale = 'en-US';
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('projects authoritative Team quotes, labels, and percentage presentation', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.47'),
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away).toMatchObject({
      abbreviation: 'ARI',
      label: 'ARI Cardinals',
      formattedPrice: '47¢',
      multiplier: '2.13x',
      percent: 47,
      percentLabel: '47%',
      canOrder: true,
    });
    expect(result.teams.home).toMatchObject({
      abbreviation: 'CAR',
      label: 'CAR Panthers',
      formattedPrice: '53¢',
      multiplier: '1.89x',
      percent: 53,
      percentLabel: '53%',
      canOrder: true,
    });
    expect(result.draw).toBeUndefined();
    expect(result.showScore).toBe(true);
  });

  it('projects a unique draw market for 3-way games', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.45'),
      createMarket('draw', 'draw', '0.25'),
      createMarket('home', 'home', '0.30'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.draw).toMatchObject({
      formattedPrice: '25¢',
      percent: 25,
      percentLabel: '25%',
      canOrder: true,
    });
    expect(result.hiddenMarketCount).toBe(0);
  });

  it('omits a Team quote when multiple Outcomes claim its Game Selection', () => {
    const event = createEvent([
      createMarket('away-one', 'away', '0.47'),
      createMarket('away-two', 'away', '0.48'),
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.quote).toBeUndefined();
    expect(result.teams.home.quote?.market.id).toBe('home');
    expect(result.hiddenMarketCount).toBe(2);
  });

  it('keeps an unavailable Team quote visible without a percent label', () => {
    const event = createEvent([
      createMarket('away', 'away'),
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.quote?.market.id).toBe('away');
    expect(result.teams.away.formattedPrice).toBeUndefined();
    expect(result.teams.away.percentLabel).toBeUndefined();
    expect(result.teams.away.canOrder).toBe(false);
    expect(result.hiddenMarketCount).toBe(1);
  });

  it('marks an inactive Market quote as non-orderable', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.47', 'inactive'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.percentLabel).toBe('47%');
    expect(result.teams.away.canOrder).toBe(false);
  });

  it('trades the Yes Outcome even when the Game Selection is on the No Outcome', () => {
    const awayYes = {
      ...createOutcome('away-yes', undefined, '0.47'),
      side: 'yes' as const,
    };
    const awayNo = {
      ...createOutcome('away-no', 'away'),
      side: 'no' as const,
    };
    const event = createEvent([
      {
        id: 'away' as PredictEntityId,
        question: 'away',
        status: 'active',
        ...fullGameMoneylineMetadata(),
        outcomes: [awayYes, awayNo],
      },
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.quote).toEqual({
      market: expect.objectContaining({ id: 'away' }),
      outcome: awayYes,
    });
    expect(result.teams.away.percentLabel).toBe('47%');
    expect(result.teams.away.canOrder).toBe(true);
  });

  it('projects live period and clock with competition', () => {
    const event = createEvent([]);

    const result = createGameCardProjection(event, game);

    expect(result.status).toEqual({
      isLive: true,
      liveText: 'Q4 12:22',
      competition: 'NFL',
    });
    expect(result.showScore).toBe(true);
  });

  it('projects scheduled start date using formatGameStartShort and hides score', () => {
    jest.useFakeTimers({ now: new Date('2026-09-08T16:00:00Z') });
    const scheduledGame: PredictGame = { ...game, status: 'scheduled' };
    const event = createEvent([]);

    const result = createGameCardProjection(event, scheduledGame);
    jest.useRealTimers();

    expect(result.status).toEqual({
      isLive: false,
      statusText: 'Thu · 8:20 PM',
      competition: 'NFL',
    });
    expect(result.showScore).toBe(false);
  });

  it('projects Final for completed games without stale clock and keeps score', () => {
    const completedGame: PredictGame = { ...game, status: 'completed' };
    const event = createEvent([]);

    const result = createGameCardProjection(event, completedGame);

    expect(result.status).toEqual({
      isLive: false,
      statusText: strings('predict_next.event.game_status.final'),
      competition: 'NFL',
    });
    expect(result.showScore).toBe(true);
  });

  it.each([
    ['delayed', 'Delayed'],
    ['suspended', 'Suspended'],
    ['postponed', 'Postponed'],
    ['canceled', 'Canceled'],
  ] as const)(
    'projects %s status without stale clock or score',
    (status, expected) => {
      const nextGame: PredictGame = { ...game, status };
      const event = createEvent([]);

      const result = createGameCardProjection(event, nextGame);

      expect(result.status).toEqual({
        isLive: false,
        statusText: expected,
        competition: 'NFL',
      });
      expect(result.showScore).toBe(false);
    },
  );

  it('projects no probability when Team prices total zero', () => {
    const event = createEvent([
      createMarket('away', 'away', '0'),
      createMarket('home', 'home', '0'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.firstTeamProbabilityPercent).toBeUndefined();
  });

  it('projects the away Team first when the Game sends no Team order', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.25'),
      createMarket('home', 'home', '0.75'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teamOrder).toEqual(['away', 'home']);
    expect(result.firstTeamProbabilityPercent).toBe(25);
  });

  it('projects the home Team first for a home_first Game', () => {
    const homeFirstGame: PredictGame = { ...game, teamOrder: 'home_first' };
    const event = createEvent([
      createMarket('away', 'away', '0.25'),
      createMarket('home', 'home', '0.75'),
    ]);

    const result = createGameCardProjection(event, homeFirstGame);

    expect(result.teamOrder).toEqual(['home', 'away']);
    expect(result.firstTeamProbabilityPercent).toBe(75);
  });
});
