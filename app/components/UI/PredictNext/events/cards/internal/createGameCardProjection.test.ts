import I18n from '../../../../../../../locales/i18n';
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
import { createGameCardProjection } from './createGameCardProjection';

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
    game,
  },
  markets,
  ...overrides,
});

describe('createGameCardProjection', () => {
  const originalLocale = I18n.locale;

  beforeAll(() => {
    I18n.locale = 'en-US';
  });

  afterAll(() => {
    I18n.locale = originalLocale;
  });

  it('projects authoritative Team quotes and price presentation', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.47'),
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away).toMatchObject({
      abbreviation: 'ARI',
      formattedPrice: '47¢',
      multiplier: '2.13x',
      percent: 47,
      canOrder: true,
    });
    expect(result.teams.home).toMatchObject({
      abbreviation: 'CAR',
      formattedPrice: '53¢',
      multiplier: '1.89x',
      percent: 53,
      canOrder: true,
    });
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

  it('keeps an unavailable Team quote visible but excludes its Market representation', () => {
    const event = createEvent([
      createMarket('away', 'away'),
      createMarket('home', 'home', '0.53'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.quote?.market.id).toBe('away');
    expect(result.teams.away.formattedPrice).toBeUndefined();
    expect(result.teams.away.canOrder).toBe(false);
    expect(result.hiddenMarketCount).toBe(1);
  });

  it('marks an inactive Market quote as non-orderable', () => {
    const event = createEvent([
      createMarket('away', 'away', '0.47', 'inactive'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.teams.away.formattedPrice).toBe('47¢');
    expect(result.teams.away.canOrder).toBe(false);
  });

  it('projects Game status for compact and featured variants', () => {
    const scheduledGame: PredictGame = { ...game, status: 'scheduled' };
    const event = createEvent([]);
    if (!event.sports) {
      throw new Error('Sports context fixture missing');
    }
    event.sports.game = scheduledGame;

    const result = createGameCardProjection(event, scheduledGame);

    expect(result.status.compact).toEqual({
      label: 'September 10 · 8:20 PM',
      metadata: '',
    });
    expect(result.status.featured).toEqual({
      label: 'Thursday, September 10',
      metadata: '8:20 PM',
    });
  });

  it('projects no probability when Team prices total zero', () => {
    const event = createEvent([
      createMarket('away', 'away', '0'),
      createMarket('home', 'home', '0'),
    ]);

    const result = createGameCardProjection(event, game);

    expect(result.awayProbabilityPercent).toBeUndefined();
  });
});
