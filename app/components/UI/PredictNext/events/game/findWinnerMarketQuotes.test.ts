import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictMarketGroup,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { findWinnerMarketQuotes } from './findWinnerMarketQuotes';

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
  group?: PredictMarketGroup,
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  outcomes,
  ...(group ? { group } : {}),
});

const createEvent = (markets: readonly PredictMarket[]): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  markets,
});

const spreadGroup: PredictMarketGroup = {
  key: 'spread-1',
  groupType: 'marketSelector',
  marketType: 'spread',
  option: { type: 'number', value: 3.5 },
};

describe('findWinnerMarketQuotes', () => {
  it('returns unique ungrouped home and away quotes', () => {
    const awayYes = createOutcome('away-yes', 'yes', 'away');
    const homeYes = createOutcome('home-yes', 'yes', 'home');
    const event = createEvent([
      createMarket('away', [awayYes, createOutcome('away-no', 'no')]),
      createMarket('home', [homeYes, createOutcome('home-no', 'no')]),
    ]);

    expect(findWinnerMarketQuotes(event)).toEqual({
      away: { market: event.markets[0], outcome: awayYes },
      home: { market: event.markets[1], outcome: homeYes },
    });
  });

  it('includes a unique draw quote when present', () => {
    const awayYes = createOutcome('away-yes', 'yes', 'away');
    const homeYes = createOutcome('home-yes', 'yes', 'home');
    const drawYes = createOutcome('draw-yes', 'yes', 'draw');
    const event = createEvent([
      createMarket('away', [awayYes, createOutcome('away-no', 'no')]),
      createMarket('home', [homeYes, createOutcome('home-no', 'no')]),
      createMarket('draw', [drawYes, createOutcome('draw-no', 'no')]),
    ]);

    expect(findWinnerMarketQuotes(event)).toEqual({
      away: { market: event.markets[0], outcome: awayYes },
      home: { market: event.markets[1], outcome: homeYes },
      draw: { market: event.markets[2], outcome: drawYes },
    });
  });

  it('fails closed when a home or away Game Selection is missing', () => {
    const event = createEvent([
      createMarket('away', [
        createOutcome('away-yes', 'yes', 'away'),
        createOutcome('away-no', 'no'),
      ]),
    ]);

    expect(findWinnerMarketQuotes(event)).toBeUndefined();
  });

  it('fails closed when a home or away Game Selection is duplicated', () => {
    const event = createEvent([
      createMarket('away-one', [
        createOutcome('away-one-yes', 'yes', 'away'),
        createOutcome('away-one-no', 'no'),
      ]),
      createMarket('away-two', [
        createOutcome('away-two-yes', 'yes', 'away'),
        createOutcome('away-two-no', 'no'),
      ]),
      createMarket('home', [
        createOutcome('home-yes', 'yes', 'home'),
        createOutcome('home-no', 'no'),
      ]),
    ]);

    expect(findWinnerMarketQuotes(event)).toBeUndefined();
  });

  it('omits an ambiguous draw without failing the winner quotes', () => {
    const awayYes = createOutcome('away-yes', 'yes', 'away');
    const homeYes = createOutcome('home-yes', 'yes', 'home');
    const event = createEvent([
      createMarket('away', [awayYes, createOutcome('away-no', 'no')]),
      createMarket('home', [homeYes, createOutcome('home-no', 'no')]),
      createMarket('draw-one', [
        createOutcome('draw-one-yes', 'yes', 'draw'),
        createOutcome('draw-one-no', 'no'),
      ]),
      createMarket('draw-two', [
        createOutcome('draw-two-yes', 'yes', 'draw'),
        createOutcome('draw-two-no', 'no'),
      ]),
    ]);

    expect(findWinnerMarketQuotes(event)).toEqual({
      away: { market: event.markets[0], outcome: awayYes },
      home: { market: event.markets[1], outcome: homeYes },
    });
  });

  it('does not treat grouped spread Game Selections as winner quotes', () => {
    const awayYes = createOutcome('away-yes', 'yes', 'away');
    const homeYes = createOutcome('home-yes', 'yes', 'home');
    const event = createEvent([
      createMarket('away', [awayYes, createOutcome('away-no', 'no')]),
      createMarket('home', [homeYes, createOutcome('home-no', 'no')]),
      createMarket(
        'spread-away',
        [
          createOutcome('spread-away-yes', 'yes', 'away'),
          createOutcome('spread-away-no', 'no'),
        ],
        spreadGroup,
      ),
      createMarket(
        'spread-home',
        [
          createOutcome('spread-home-yes', 'yes', 'home'),
          createOutcome('spread-home-no', 'no'),
        ],
        spreadGroup,
      ),
    ]);

    expect(findWinnerMarketQuotes(event)).toEqual({
      away: { market: event.markets[0], outcome: awayYes },
      home: { market: event.markets[1], outcome: homeYes },
    });
  });
});
