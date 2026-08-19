import type {
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictVenueId,
} from '../../../types';
import { projectGameCard } from './projectGameCard';

const createOutcome = (
  id: string,
  gameSelection: 'home' | 'away' | 'draw',
  askPrice?: string,
): PredictOutcome => ({
  id: id as PredictEntityId,
  side: 'yes',
  label: id,
  askPrice: askPrice as PredictDecimal | undefined,
  gameSelection,
});

const createMarket = (
  id: string,
  selection: 'home' | 'away' | 'draw',
  askPrice: string | null = '0.53',
): PredictMarket => ({
  id: id as PredictEntityId,
  question: id,
  status: 'active',
  outcomes: [
    createOutcome(`${id}-yes`, selection, askPrice ?? undefined),
    {
      id: `${id}-no` as PredictEntityId,
      side: 'no',
      label: 'No',
    },
  ],
});

const createEvent = (markets: PredictMarket[]): PredictEvent => ({
  venueId: 'kalshi' as PredictVenueId,
  id: 'game-event' as PredictEntityId,
  title: 'Cardinals vs Panthers',
  markets,
});

describe('projectGameCard', () => {
  it('maps a unique Game Selection on each Team to that Team quote', () => {
    const event = createEvent([
      createMarket('away-market', 'away', '0.47'),
      createMarket('home-market', 'home', '0.53'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.quotes.away?.market.id).toBe('away-market');
    expect(projection.quotes.home?.market.id).toBe('home-market');
    expect(projection.quotes.away?.outcome.gameSelection).toBe('away');
    expect(projection.quotes.home?.outcome.gameSelection).toBe('home');
  });

  it('omits a Team quote when more than one Market shares that Game Selection', () => {
    const event = createEvent([
      createMarket('away-one', 'away', '0.47'),
      createMarket('away-two', 'away', '0.48'),
      createMarket('home', 'home', '0.53'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.quotes.away).toBeUndefined();
    expect(projection.quotes.home?.market.id).toBe('home');
  });

  it('omits a Team quote when no Outcome carries that Game Selection', () => {
    const event = createEvent([createMarket('home', 'home', '0.53')]);

    const projection = projectGameCard(event);

    expect(projection.quotes.away).toBeUndefined();
    expect(projection.quotes.home?.market.id).toBe('home');
  });

  it('does not treat a draw Game Selection as a Team quote', () => {
    const event = createEvent([
      createMarket('away-market', 'away', '0.47'),
      createMarket('home-market', 'home', '0.53'),
      createMarket('draw-market', 'draw', '0.10'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.quotes.away?.market.id).toBe('away-market');
    expect(projection.quotes.home?.market.id).toBe('home-market');
    expect(
      projection.representedMarketIds.has('draw-market' as PredictEntityId),
    ).toBe(false);
  });

  it('counts a Market as represented only when its Ask Price can be formatted', () => {
    const event = createEvent([
      createMarket('away', 'away', null),
      createMarket('home', 'home', '0.53'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.quotes.away?.market.id).toBe('away');
    expect(projection.representedMarketIds.has('away' as PredictEntityId)).toBe(
      false,
    );
    expect(projection.representedMarketIds.has('home' as PredictEntityId)).toBe(
      true,
    );
    expect(projection.hiddenMarketCount).toBe(1);
  });

  it('counts Markets without a unique Team quote as hidden', () => {
    const event = createEvent([
      createMarket('away-market', 'away', '0.47'),
      createMarket('home-market', 'home', '0.53'),
      createMarket('prop-market', 'draw', undefined),
    ]);

    const projection = projectGameCard(event);

    expect(projection.hiddenMarketCount).toBe(1);
    expect(
      projection.representedMarketIds.has('prop-market' as PredictEntityId),
    ).toBe(false);
  });

  it('computes away probability as a share of both Ask Prices', () => {
    const event = createEvent([
      createMarket('away-market', 'away', '0.47'),
      createMarket('home-market', 'home', '0.53'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.probability?.awayPercent).toBe(47);
  });

  it('omits probability when either Team quote is missing', () => {
    const event = createEvent([
      createMarket('away-one', 'away', '0.47'),
      createMarket('away-two', 'away', '0.48'),
      createMarket('home', 'home', '0.53'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.probability).toBeUndefined();
  });

  it('omits probability when both Ask Prices are zero', () => {
    const event = createEvent([
      createMarket('away', 'away', '0'),
      createMarket('home', 'home', '0'),
    ]);

    const projection = projectGameCard(event);

    expect(projection.probability).toBeUndefined();
  });
});
