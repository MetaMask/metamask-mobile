import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { findGameSelectionQuote } from './findGameSelectionQuote';

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

const createEvent = (markets: readonly PredictMarket[]): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
  markets,
});

describe('findGameSelectionQuote', () => {
  it('returns the unique Market and Outcome for a Game Selection', () => {
    const awayYes = createOutcome('away-yes', 'yes', 'away');
    const homeYes = createOutcome('home-yes', 'yes', 'home');
    const event = createEvent([
      createMarket('away', [awayYes, createOutcome('away-no', 'no')]),
      createMarket('home', [homeYes, createOutcome('home-no', 'no')]),
    ]);

    const result = findGameSelectionQuote(event, 'away');

    expect(result).toEqual({
      market: event.markets[0],
      outcome: awayYes,
    });
  });

  it('returns a quote when Game Selection is on the No Outcome', () => {
    const awayNo = createOutcome('away-no', 'no', 'away');
    const event = createEvent([
      createMarket('away', [createOutcome('away-yes', 'yes'), awayNo]),
    ]);

    const result = findGameSelectionQuote(event, 'away');

    expect(result).toEqual({
      market: event.markets[0],
      outcome: awayNo,
    });
  });

  it('returns undefined when multiple Outcomes claim the same Game Selection', () => {
    const event = createEvent([
      createMarket('away-one', [
        createOutcome('away-one-yes', 'yes', 'away'),
        createOutcome('away-one-no', 'no'),
      ]),
      createMarket('away-two', [
        createOutcome('away-two-yes', 'yes', 'away'),
        createOutcome('away-two-no', 'no'),
      ]),
    ]);

    const result = findGameSelectionQuote(event, 'away');

    expect(result).toBeUndefined();
  });

  it('returns undefined when no Outcome has the Game Selection', () => {
    const event = createEvent([
      createMarket('home', [
        createOutcome('home-yes', 'yes', 'home'),
        createOutcome('home-no', 'no'),
      ]),
    ]);

    const result = findGameSelectionQuote(event, 'away');

    expect(result).toBeUndefined();
  });
});
