import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { EVENT_CARD_VISIBLE_MARKET_COUNT } from './internal/EventCard';
import { getEventCardLiveMarketIds } from './getEventCardLiveMarketIds';

const venueId = 'kalshi' as PredictVenueId;

const createOutcome = (
  id: string,
  side: PredictOutcome['side'],
  gameSelection?: PredictOutcome['gameSelection'],
): PredictOutcome => ({
  id: id as PredictEntityId,
  side,
  label: id,
  gameSelection,
});

const createMarket = (
  id: string,
  outcomes: readonly [PredictOutcome, PredictOutcome],
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  outcomes,
});

const createEvent = (
  markets: readonly PredictMarket[],
  withGame: boolean,
): PredictEvent => ({
  venueId,
  id: 'event' as PredictEntityId,
  title: 'event',
  markets,
  ...(withGame
    ? {
        sports: {
          sport: {
            id: 'american-football' as PredictEntityId,
            label: 'American football',
          },
          game: {
            status: 'scheduled' as const,
            homeTeam: { name: 'Home' },
            awayTeam: { name: 'Away' },
            observedAt: '2026-09-08T12:00:00.000Z' as PredictTimestamp,
          },
        },
      }
    : {}),
});

describe('getEventCardLiveMarketIds', () => {
  it('returns unique winner Market ids for a Game Event', () => {
    const away = createMarket('away', [
      createOutcome('away-yes', 'yes', 'away'),
      createOutcome('away-no', 'no'),
    ]);
    const home = createMarket('home', [
      createOutcome('home-yes', 'yes', 'home'),
      createOutcome('home-no', 'no'),
    ]);
    const spread = createMarket('spread', [
      createOutcome('spread-yes', 'yes'),
      createOutcome('spread-no', 'no'),
    ]);

    const ids = getEventCardLiveMarketIds(
      createEvent([away, home, spread], true),
    );

    expect(ids).toEqual([away.id, home.id]);
  });

  it('includes a unique draw Market when the Game has one', () => {
    const away = createMarket('away', [
      createOutcome('away-yes', 'yes', 'away'),
      createOutcome('away-no', 'no'),
    ]);
    const home = createMarket('home', [
      createOutcome('home-yes', 'yes', 'home'),
      createOutcome('home-no', 'no'),
    ]);
    const draw = createMarket('draw', [
      createOutcome('draw-yes', 'yes', 'draw'),
      createOutcome('draw-no', 'no'),
    ]);

    const ids = getEventCardLiveMarketIds(
      createEvent([away, home, draw], true),
    );

    expect(ids).toEqual([away.id, home.id, draw.id]);
  });

  it('returns no Market ids when a Game Event has no unique winner quotes', () => {
    const spread = createMarket('spread', [
      createOutcome('spread-yes', 'yes'),
      createOutcome('spread-no', 'no'),
    ]);

    expect(getEventCardLiveMarketIds(createEvent([spread], true))).toEqual([]);
  });

  it('returns the first visible Markets for a standard Event', () => {
    const markets = Array.from(
      { length: EVENT_CARD_VISIBLE_MARKET_COUNT + 2 },
      (_, index) =>
        createMarket(`m${index}`, [
          createOutcome(`m${index}-yes`, 'yes'),
          createOutcome(`m${index}-no`, 'no'),
        ]),
    );

    const ids = getEventCardLiveMarketIds(createEvent(markets, false));

    expect(ids).toEqual(
      markets
        .slice(0, EVENT_CARD_VISIBLE_MARKET_COUNT)
        .map((market) => market.id),
    );
  });
});
