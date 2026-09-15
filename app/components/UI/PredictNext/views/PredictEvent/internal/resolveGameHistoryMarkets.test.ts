import { makePredictNextCompositeGameEvent } from '../../../../../../../tests/component-view/fixtures/predictNext';
import { resolveGameHistoryMarkets } from './resolveGameHistoryMarkets';

describe('resolveGameHistoryMarkets', () => {
  it('selects ungrouped winners when grouped spreads come first', () => {
    const event = makePredictNextCompositeGameEvent();
    const groupedMarkets = event.markets.filter(
      (market) => market.group !== undefined,
    );
    const winnerMarkets = event.markets.filter(
      (market) => market.group === undefined,
    );

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: [...groupedMarkets, ...winnerMarkets],
    });

    expect(result?.home.market.id).toBe('nfl-composite-home-market');
    expect(result?.away.market.id).toBe('nfl-composite-away-market');
  });

  it('returns no pair when ungrouped winners are missing', () => {
    const event = makePredictNextCompositeGameEvent();

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: event.markets.filter((market) => market.group !== undefined),
    });

    expect(result).toBeUndefined();
  });

  it('returns no pair when one winner selection is ambiguous', () => {
    const event = makePredictNextCompositeGameEvent();
    const homeMarket = event.markets.find(
      (market) =>
        market.group === undefined &&
        market.outcomes.some(
          (outcome) =>
            outcome.side === 'yes' && outcome.gameSelection === 'home',
        ),
    );
    if (homeMarket === undefined) {
      throw new Error('Expected a home winner Market fixture.');
    }

    const result = resolveGameHistoryMarkets({
      ...event,
      markets: [...event.markets, homeMarket],
    });

    expect(result).toBeUndefined();
  });
});
